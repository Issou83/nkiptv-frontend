import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { useUIStore } from '../../store'

const MAX_RETRIES = 3

export default function HLSPlayer({ src, channelId, autoplay = true, onError, onReady }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const retryCountRef = useRef(0)
  const srcRef = useRef(src)

  const [status, setStatus] = useState('idle')   // idle | loading | playing | paused | error
  const [showControls, setShowControls] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [levels, setLevels] = useState([])
  const [isMuted, setIsMuted] = useState(false)   // track UI mute state separately

  const containerRef = useRef(null)
  const controlsTimer = useRef(null)
  const mountedRef = useRef(true)    // false after unmount
  const initSeqRef = useRef(0)       // incremented on every initPlayer call; callbacks check this
  const watchdogRef = useRef(null)   // holds watchdog timer so we can cancel it

  // Granular selectors → HLSPlayer only re-renders when volume/muted change,
  // not when setCurrentChannel or any other unrelated store key is updated.
  const volume   = useUIStore(s => s.volume)
  const muted    = useUIStore(s => s.muted)
  const setVolume = useUIStore(s => s.setVolume)
  const setMuted  = useUIStore(s => s.setMuted)

  // Use ref so callbacks always access fresh values without stale closures
  const onErrorRef = useRef(onError)
  const onReadyRef = useRef(onReady)
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { onReadyRef.current = onReady }, [onReady])

  // Track the 'playing' listener so we can remove it on each new init
  const playingListenerRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  const initPlayer = useCallback((url) => {
    const video = videoRef.current
    if (!video || !url) return

    // Cancel any pending watchdog from the previous init
    clearTimeout(watchdogRef.current)
    watchdogRef.current = null

    // Bump sequence — any callbacks from the previous init that fire after this
    // point will see seq !== initSeqRef.current and bail out early.
    const seq = ++initSeqRef.current

    // Remove previous 'playing' listener before destroying
    if (playingListenerRef.current) {
      video.removeEventListener('playing', playingListenerRef.current)
      playingListenerRef.current = null
    }

    destroyHls()
    retryCountRef.current = 0
    if (mountedRef.current) {
      setStatus('loading')
      setLevels([])
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 20,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        fragLoadingMaxRetry: 4,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        fragLoadingRetryDelay: 1000,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false
        },
      })

      hlsRef.current = hls

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        // Stale-init guard: if a newer initPlayer call has already started, ignore this.
        if (seq !== initSeqRef.current || !mountedRef.current) return

        setLevels(data.levels || [])

        // Explicitly tell the stream controller to start loading segments.
        // Normally this happens automatically on MEDIA_ATTACHED, but calling it
        // here as well ensures segment loading starts even if the controller got
        // stuck in IDLE (e.g. after a race with attachMedia / loadSource ordering).
        try { hls.startLoad(-1) } catch (_e) { /* already loading — fine */ }

        if (autoplay) {
          // Try unmuted first; fall back to muted autoplay (browser policy)
          video.play().catch(() => {
            if (!mountedRef.current || seq !== initSeqRef.current) return
            video.muted = true
            setIsMuted(true)
            video.play().catch(() => {
              if (mountedRef.current && seq === initSeqRef.current) setStatus('paused')
            })
          })
        } else {
          setStatus('paused')
        }
        onReadyRef.current?.()

        // ── Watchdog ──────────────────────────────────────────────────────────
        // If after 7 s the player is still not in 'playing' state (and there's
        // no user-visible error), try forcing another startLoad.  This covers
        // the case where HLS.js parsed the manifest and even created SourceBuffers
        // but never began fetching segments (streamController stuck in IDLE).
        watchdogRef.current = setTimeout(() => {
          watchdogRef.current = null
          if (!mountedRef.current || seq !== initSeqRef.current) return
          const v = videoRef.current
          const h = hlsRef.current
          if (!v || !h) return

          const evtCount = Object.keys(h._events || {}).length
          // evtCount === 0 → instance was silently destroyed; reinitialise.
          if (evtCount === 0) {
            hlsRef.current = null        // clear stale ref before re-init
            if (mountedRef.current) initPlayer(url)
            return
          }

          // Still loading / paused but HLS is alive → nudge it
          if (!v.paused && v.readyState < 3) {
            try { h.startLoad(-1) } catch (_e) {}
          }
        }, 7000)

        // Cancel watchdog when this HLS instance is destroyed
        hls.on(Hls.Events.DESTROYING, () => {
          clearTimeout(watchdogRef.current)
          watchdogRef.current = null
        })
      })

      // Track 'playing' listener so we can clean it up on the next init
      const playingListener = () => {
        if (mountedRef.current && seq === initSeqRef.current) setStatus('playing')
      }
      playingListenerRef.current = playingListener
      video.addEventListener('playing', playingListener)

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (seq !== initSeqRef.current || !mountedRef.current) return
        if (!data.fatal) return

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1
            setTimeout(() => {
              if (hlsRef.current && seq === initSeqRef.current) hlsRef.current.startLoad()
            }, 2000 * retryCountRef.current)
          } else {
            setStatus('error')
            onErrorRef.current?.('Stream inaccessible après plusieurs tentatives')
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
        } else {
          setStatus('error')
          onErrorRef.current?.('Erreur de lecture du stream')
        }
      })

      // Attach media BEFORE loading source (more reliable)
      hls.attachMedia(video)
      hls.loadSource(url)

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = url
      const onMeta = () => {
        if (!mountedRef.current || seq !== initSeqRef.current) return
        setStatus('paused')
        if (autoplay) {
          video.play().catch(() => {
            video.muted = true
            setIsMuted(true)
            video.play().catch(() => {})
          })
        }
        onReadyRef.current?.()
      }
      const playingListener = () => {
        if (mountedRef.current && seq === initSeqRef.current) setStatus('playing')
      }
      playingListenerRef.current = playingListener
      video.addEventListener('loadedmetadata', onMeta, { once: true })
      video.addEventListener('playing', playingListener)
      video.addEventListener('error', () => {
        if (mountedRef.current && seq === initSeqRef.current) {
          setStatus('error')
          onErrorRef.current?.('Erreur lecture vidéo')
        }
      })
    } else {
      setStatus('error')
      onErrorRef.current?.('HLS non supporté sur ce navigateur')
    }
  }, [autoplay, destroyHls])

  // Re-init when src changes
  useEffect(() => {
    srcRef.current = src
    if (src) initPlayer(src)
    return () => {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
      destroyHls()
      // Remove playing listener on cleanup
      const video = videoRef.current
      if (video && playingListenerRef.current) {
        video.removeEventListener('playing', playingListenerRef.current)
        playingListenerRef.current = null
      }
    }
  }, [src, initPlayer, destroyHls])

  // Sync volume & mute to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = Math.max(0, Math.min(1, volume / 100))
    // Only apply global mute if we're not in forced-muted-autoplay mode
    if (!isMuted) video.muted = muted
  }, [volume, muted, isMuted])

  // Unmuté indicator
  const handleUnmute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    setIsMuted(false)
  }

  // Time tracking
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const update = () => {
      setCurrentTime(video.currentTime)
      setDuration(video.duration || 0)
    }
    video.addEventListener('timeupdate', update)
    video.addEventListener('durationchange', update)
    return () => {
      video.removeEventListener('timeupdate', update)
      video.removeEventListener('durationchange', update)
    }
  }, [])

  // Fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler)
    }
  }, [])

  const showControlsTemp = () => {
    setShowControls(true)
    clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  const handleVideoClick = () => {
    if (status === 'paused') togglePlay()
    else showControlsTemp()
  }

  const toggleMute = () => {
    if (isMuted) {
      handleUnmute()
    } else {
      setMuted(!muted)
    }
  }

  const toggleFS = async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())
      } else {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.())
      }
    } catch {}
  }

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '🔴 LIVE'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 100
  const effectiveMuted = isMuted || muted

  return (
    <div
      ref={containerRef}
      className={`player-container${isFullscreen ? ' fullscreen' : ''}`}
      style={{ width: '100%', aspectRatio: '16/9', maxHeight: 'calc(100vh - 160px)', background: '#000' }}
      onMouseMove={showControlsTemp}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={showControlsTemp}
      onClick={handleVideoClick}
    >
      <video
        ref={videoRef}
        className="player-video"
        playsInline
        webkit-playsinline="true"
        style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', gap: 16 }}>
          <div className="splash-loader"><span /><span /><span /></div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Chargement du stream…</p>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', gap: 12 }}>
          <span style={{ fontSize: '3rem' }}>📡</span>
          <p style={{ color: '#ff6b6b', fontWeight: 700, fontSize: 16 }}>Stream indisponible</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Ce flux n’est peut-être pas disponible dans votre région</p>
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => { e.stopPropagation(); retryCountRef.current = 0; initPlayer(srcRef.current) }}
          >
            🔄 Réessayer
          </button>
        </div>
      )}

      {/* Paused overlay */}
      {status === 'paused' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '1.8rem', marginLeft: 6 }}>▶</span>
          </div>
        </div>
      )}

      {/* Muted autoplay banner */}
      {isMuted && status === 'playing' && (
        <div
          style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', borderRadius: 20, padding: '6px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { e.stopPropagation(); handleUnmute() }}
        >
          🔇 <span>Appuyer pour activer le son</span>
        </div>
      )}

      {/* Controls overlay */}
      <div className="player-overlay" style={{ opacity: showControls && status !== 'loading' ? 1 : 0, transition: 'opacity 0.3s' }}>
        <div /> {/* spacer */}
        <div onClick={(e) => e.stopPropagation()}>
          {/* Progress bar */}
          <div
            className="player-progress"
            onClick={(e) => {
              if (!duration) return
              const rect = e.currentTarget.getBoundingClientRect()
              if (videoRef.current) videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
            }}
          >
            <div className="player-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Controls bar */}
          <div className="player-controls">
            <button
              onClick={togglePlay}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}
            >
              {status === 'playing' ? '⏸' : '▶'}
            </button>

            <button
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
            >
              {effectiveMuted ? '🔇' : volume > 50 ? '🔊' : '🔉'}
            </button>

            <input
              type="range" min="0" max="100" value={effectiveMuted ? 0 : volume}
              onChange={e => { setVolume(Number(e.target.value)); if (effectiveMuted) { setMuted(false); setIsMuted(false) } }}
              style={{ width: 80, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />

            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1, textAlign: 'center' }}>
              {formatTime(currentTime)}
            </span>

            {levels.length > 1 && (
              <select
                style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 12, padding: '3px 6px', cursor: 'pointer' }}
                onChange={e => { if (hlsRef.current) hlsRef.current.currentLevel = parseInt(e.target.value) }}
              >
                <option value="-1">Auto</option>
                {levels.map((l, i) => (
                  <option key={i} value={i}>{l.height ? `${l.height}p` : `Q${i + 1}`}</option>
                ))}
              </select>
            )}

            <button
              onClick={toggleFS}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
            >
              {isFullscreen ? '⊞' : '⛶'}
            </button>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      {status === 'playing' && (
        <div style={{ position: 'absolute', top: 12, left: 12, pointerEvents: 'none' }}>
          <div className="live-pill">
            <div className="live-dot" />
            LIVE
          </div>
        </div>
      )}
    </div>
  )
}
