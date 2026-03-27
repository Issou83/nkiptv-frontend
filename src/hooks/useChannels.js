import { useQuery } from '@tanstack/react-query'
import { channelsAPI } from '../services/api'

const MOCK_CHANNELS = [
  { id:'BFM.fr', name:'BFM TV', country:'FR', categories:['news'], logo:null, streams:[{url:'https://stream.bfmtv.com/bfmtv/ngrp:bfmtv_all/playlist.m3u8'}] },
  { id:'CNEWS.fr', name:'CNews', country:'FR', categories:['news'], logo:null, streams:[] },
  { id:'CNN.us', name:'CNN International', country:'US', categories:['news'], logo:null, streams:[{url:'https://cnn-cnninternational-1-eu.samsung.wurl.tv/manifest/playlist.m3u8'}] },
  { id:'BBC.gb', name:'BBC World News', country:'GB', categories:['news'], logo:null, streams:[{url:'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_world_service/t=3840/v=pv14/b=5070016/main.m3u8'}] },
  { id:'AlJazeera.qa', name:'Al Jazeera', country:'QA', categories:['news'], logo:null, streams:[{url:'https://live-hls-web-aje.getaj.net/AJE/01.m3u8'}] },
  { id:'Bloomberg.us', name:'Bloomberg TV', country:'US', categories:['business'], logo:null, streams:[{url:'https://cdn3.wowza.com/1/ejFVZldicUgySjE5/cVdRSk91/hls/live/playlist.m3u8'}] },
  { id:'ARTE.fr', name:'Arte', country:'FR', categories:['culture'], logo:null, streams:[{url:'https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/master.m3u8'}] },
  { id:'Eurosport.fr', name:'Eurosport', country:'FR', categories:['sports'], logo:null, streams:[] },
  { id:'MTV.fr', name:'MTV France', country:'FR', categories:['music'], logo:null, streams:[] },
  { id:'NatGeo.us', name:'National Geographic', country:'US', categories:['documentary'], logo:null, streams:[] },
  { id:'Disney.us', name:'Disney Channel', country:'US', categories:['kids'], logo:null, streams:[] },
  { id:'ESPN.us', name:'ESPN', country:'US', categories:['sports'], logo:null, streams:[] },
]

export const CATEGORY_EMOJI = {
  news: '📰', sports: '⚽', music: '🎵', movies: '🎬',
  entertainment: '🎭', kids: '🧸', documentary: '🌍',
  business: '📊', culture: '🎨', general: '📺', auto: '🚗',
  cooking: '🍳', travel: '✈️', religious: '🙏', science: '🔬',
  legislative: '🏛️', weather: '🌤️', family: '👨‍👩‍👧', comedy: '😂',
}

export const COUNTRY_FLAG = {
  FR:'🇫🇷', US:'🇺🇸', GB:'🇬🇧', DE:'🇩🇪', ES:'🇪🇸',
  IT:'🇮🇹', MA:'🇲🇦', QA:'🇶🇦', SA:'🇸🇦', BR:'🇧🇷',
  JP:'🇯🇵', CN:'🇨🇳', IN:'🇮🇳', AU:'🇦🇺', CA:'🇨🇦',
  MX:'🇲🇽', AR:'🇦🇷', NL:'🇳🇱', BE:'🇧🇪', CH:'🇨🇭',
  TR:'🇹🇷', RU:'🇷🇺', PL:'🇵🇱', PT:'🇵🇹', RO:'🇷🇴',
  DZ:'🇩🇿', TN:'🇹🇳', EG:'🇪🇬', NG:'🇳🇬', KE:'🇰🇪',
  KR:'🇰🇷', ID:'🇮🇩', TH:'🇹🇭', PK:'🇵🇰', BD:'🇧🇩',
}

export const useChannels = (filters = {}) => {
  return useQuery({
    queryKey: ['channels', filters],
    queryFn: async () => {
      try {
        const { data } = await channelsAPI.getAll({
          ...filters,
          hasStream: filters.hasStream ?? 'true',
          limit: filters.limit || 100,
        })
        return data
      } catch (err) {
        console.warn('Backend indispo — mode mock', err.message)
        let result = MOCK_CHANNELS
        if (filters.category) result = result.filter(c => c.categories?.includes(filters.category))
        if (filters.country) result = result.filter(c => c.country === filters.country.toUpperCase())
        if (filters.search) {
          const q = filters.search.toLowerCase()
          result = result.filter(c => c.name.toLowerCase().includes(q))
        }
        return { data: result, pagination: { total: result.length, page: 1, pages: 1 }, meta: { mock: true } }
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export const useChannelStats = () => {
  return useQuery({
    queryKey: ['channel-stats'],
    queryFn: async () => {
      try {
        const { data } = await channelsAPI.getStats()
        return data.data
      } catch {
        return { total: 10000, withStream: 7500, countries: 180, categories: 20, mock: true }
      }
    },
    staleTime: 10 * 60 * 1000,
  })
}

export const useFeaturedChannels = () => {
  return useQuery({
    queryKey: ['featured-channels'],
    queryFn: async () => {
      try {
        const { data } = await channelsAPI.getFeatured()
        return data.data
      } catch {
        return MOCK_CHANNELS.slice(0, 6)
      }
    },
    staleTime: 30 * 60 * 1000,
  })
}

export { MOCK_CHANNELS }
