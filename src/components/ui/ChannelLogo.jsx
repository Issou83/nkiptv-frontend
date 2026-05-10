import { useState } from 'react'
import { getProxiedLogoUrl } from '../../services/api'
import { CATEGORY_EMOJI } from '../../hooks/useChannels'

export default function ChannelLogo({ channel, className, imgStyle }) {
  const [failed, setFailed] = useState(false)
  const fallback = CATEGORY_EMOJI[channel?.categories?.[0]] || 'TV'
  const src = channel?.logo && !failed ? getProxiedLogoUrl(channel.logo) : null

  if (!src) {
    return <span className={className || 'logo-fallback'}>{fallback}</span>
  }

  return (
    <img
      src={src}
      alt={channel?.name || ''}
      style={imgStyle}
      onError={() => setFailed(true)}
    />
  )
}
