'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useMapEvents } from 'react-leaflet'
import type { Marker as LeafletMarker } from 'leaflet'
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

// Fix for default marker icon issues in React
interface LocationPickerProps {
  onLocationChange: (lat: number, lng: number) => void
  initialLat?: number
  initialLng?: number
}

function DraggableMarker({ position, onPositionChange, icon }: { position: [number, number], onPositionChange: (pos: [number, number]) => void, icon: import('leaflet').Icon }) {
  const map = useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng])
    }
  })

  const markerRef = useRef<LeafletMarker>(null)

  const handleDragEnd = () => {
    const marker = markerRef.current
    if (marker != null) {
      const position = marker.getLatLng()
      onPositionChange([position.lat, position.lng])
    }
  }

  return (
    <Marker
      position={position}
      icon={icon}
      draggable={true}
      ref={markerRef}
      eventHandlers={{
        dragend: handleDragEnd
      }}
    />
  )
}

export default function LocationPicker({ onLocationChange, initialLat, initialLng }: LocationPickerProps) {
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null)
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    import('leaflet').then(setLeaflet)
  }, [])

  const icon = leaflet?.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })

  const getCurrentLocation = () => {
    setLoading(true)
    setError('')

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newPos: [number, number] = [latitude, longitude]
        setPosition(newPos)
        onLocationChange(latitude, longitude)
        setLoading(false)
      },
      (error) => {
        setError('Unable to retrieve your location. Please enable location services.')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const handlePositionChange = (newPos: [number, number]) => {
    setPosition(newPos)
    onLocationChange(newPos[0], newPos[1])
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Getting Location...' : '📍 Use My Current Location'}
        </button>
        {position && (
          <div className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm text-zinc-700 dark:text-zinc-300">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {position && leaflet && icon && (
        <div className="h-64 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 z-0">
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker
              position={position}
              onPositionChange={handlePositionChange}
              icon={icon}
            />
          </MapContainer>
        </div>
      )}

      {position && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Drag the pin to adjust the location if needed
        </p>
      )}
    </div>
  )
}
