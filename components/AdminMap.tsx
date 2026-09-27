'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'

// Dynamically import react-leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

// Status colors for markers
const STATUS_COLORS: Record<string, string> = {
  'submitted': '#ef4444',    // red
  'under_review': '#eab308', // yellow
  'assigned': '#f97316',     // orange
  'in_progress': '#3b82f6',  // blue
  'resolved': '#22c55e'      // green
}

// Create custom icons for each status
const createCustomIcon = (leaflet: typeof import('leaflet'), color: string) => {
  return leaflet.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

interface Problem {
  id: string
  title: string
  description: string
  category: string
  status: string
  latitude: number
  longitude: number
  location: string
}

interface AdminMapProps {
  problems: Problem[]
}

export default function AdminMap({ problems }: AdminMapProps) {
  const [mounted, setMounted] = useState(false)
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null)

  useEffect(() => {
    setMounted(true)
    import('leaflet').then(setLeaflet)
  }, [])

  if (!mounted || !leaflet) {
    return (
      <div className="h-96 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading map...</p>
      </div>
    )
  }

  // Filter problems that have valid coordinates
  const problemsWithLocation = problems.filter(
    p => p.latitude && p.longitude && !isNaN(p.latitude) && !isNaN(p.longitude)
  )

  if (problemsWithLocation.length === 0) {
    return (
      <div className="h-96 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">No problems with location data</p>
      </div>
    )
  }

  // Calculate center point for map
  const avgLat = problemsWithLocation.reduce((sum, p) => sum + p.latitude, 0) / problemsWithLocation.length
  const avgLng = problemsWithLocation.reduce((sum, p) => sum + p.longitude, 0) / problemsWithLocation.length

  return (
    <div className="h-96 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
      <MapContainer
        center={[avgLat, avgLng]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {problemsWithLocation.map((problem) => (
          <Marker
            key={problem.id}
            position={[problem.latitude, problem.longitude]}
            icon={createCustomIcon(leaflet, STATUS_COLORS[problem.status] || '#8884d8')}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h4 className="font-bold text-sm mb-1">{problem.title}</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                  {problem.description.substring(0, 100)}{problem.description.length > 100 ? '...' : ''}
                </p>
                <div className="space-y-1">
                  <p className="text-xs">
                    <span className="font-medium">Status:</span>{' '}
                    <span className="capitalize" style={{ color: STATUS_COLORS[problem.status] }}>
                      {problem.status.replace(/_/g, ' ')}
                    </span>
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">Category:</span> {problem.category}
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">Location:</span> {problem.location || 'Unknown'}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
