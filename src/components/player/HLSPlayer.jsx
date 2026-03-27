import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { useUIStore } from '../../store'

const MAX_RETRIES = 3

export default function HLSPlayer({ src, channelId, autoplay = true, onError, onReady }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [retries, setRetries] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [levels, setLevels] = useState([])
  const containerRef = useRef(null)
  const controlsTimer = useRef(null)
  const { volume, muted, setVolume, setMuted } = useUIStore()

  const initPlayer = useCallback((url) => {
    const video = videoRef.current
    if (!video || !url) return

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    setStatus('loading')

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
      })

      hlsRef.current = hls

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setLevels(data.levels || [])
        setStatus('playing')
        if (autoplay) video.play().catch(() => setStatus('paused'))
        onReady?.()
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (retries < MAX_RETRIES) {
              setRetries(r => r + 1)
              setTimeout(() => hls.startLoad(), 2000)
            } else {
              setStatus('error')
              onError?.('Stream inaccessible après plusieurs tentatives')
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError()
          } else {
            setStatus('error')
            onError?.('Erreur de lecture')
          }
        }
      })

      hls.loadSource(url)
      hls.attachMedia(video)

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari natif
      video.src = url
      video.addEventListener('loadedmetadata', () => {
        setStatus('playing')
        if (autoplay) video.play().catch(() => {})
        onReady?.()
      })
      video.addEventListener('error', () => {
        setStatus('error')
        onError?.('Erreur lecture vidéo')
      })
    } else {
      setStatus('error')
      onError?.('HLS non supporté sur ce navigateur')
    }
  }, [autoplay, onError, onReady, retries])

  useEffect(() => {
    if (src) {
      setRetries(0)
      initPlayer(src)
    }
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    }
  }, [src])

  // Volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100
      videoRef.current.muted = muted
    }
  }, [volume, muted])

  // Temps
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const update = () => { setCurrentTime(video.currentTime); setDuration(video.duration || 0) }
    video.addEventListener('timeupdate', update)
    return () => video.removeEventListener('timeupdate', update)
  }, [])

  // Fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const showControlsTemp = () => {
    setShowControls(true)
    clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setStatus('playing') }
    else { v.pause(); setStatus('paused') }
  }

  const toggleMute = () => setMuted(!muted)

  const toggleFS = () => {
    const el = containerRef.current
    if (!document.fullscreenElement) el.requestFullscreen()
    else document.exitFullscreen()
  }

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '🔴 LIVE'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 100

  return (
    <div ref={containerRef} className="player-container"
      style={{ width: '100%', aspectRatio: '16/9', maxHeight: 'calc(100vh - 180px)', background: '#000' }}
      onMouseMove={showControlsTemp}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}>

      <video ref={videoRef} className="player-video" playsInline />

      {/* Loading */}
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div className="splash-loader"><span/><span/><span/></div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', gap: 12 }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ color: '#ff6b6b', fontWeight: 600 }}>Stream indisponible</p>
          <button className="btn btn-primary btn-sm" onClick={() => { setStatus('idle'); setTimeout(() => initPlayer(src), 500) }}>
            🔄 Réessayer
          </button>
        </div>
      )}

      {/* Paused overlay */}
      {status === 'paused' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={togglePlay}>
          <div style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '1.8rem', marginLeft: 4 }}>▶</span>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="player-overlay" style={{ opacity: showControls ? 1 : 0 }}>
        <div /> {/* spacer */}
        <div>
          {/* Progress */}
          <div className="player-progress" onClick={(e) => {
            if (!duration) return
            const rect = e.currentTarget.getBoundingClientRect()
            videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
          }}>
            <div className="player-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Controls bar */}
          <div className="player-controls">
            <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>
              {status === 'playing' ? '⏸' : '▶'}
            </button>

            <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
              {muted ? '🔇' : volume > 50 ? '🔊' : '🔉'}
            </button>

            <input type="range" min="0" max="100" value={muted ? 0 : volume}
              onChange={e => { setVolume(Number(e.target.value)); if (muted) setMuted(false) }}
              style={{ width: 80, accentColor: 'var(--accent)' }} />

            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1, textAlign: 'center' }}>
              {formatTime(currentTime)}
            </span>

            {levels.length > 1 && (
              <select
                style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 12, padding: '3px 6px', cursor: 'pointer' }}
                onChange={e => { if (hlsRef.current) hlsRef.current.currentLevel = parseInt(e.target.value) }}>
                <option value="-1">Auto</option>
                {levels.map((l, i) => (
                  <option key={i} value={i}>{l.height}p</option>
                ))}
              </select>
            )}

            <button onClick={toggleFS} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      {status === 'playing' && (
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <div className="live-pill">
            <div className="live-dot" />
            LIVE
          </div>
        </div>
      )}
    </div>
  )
}
