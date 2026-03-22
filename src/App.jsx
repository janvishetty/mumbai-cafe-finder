import React, { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import axios from "axios"
import "./index.css"

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 }
const BBOX = "18.89,72.77,19.27,72.98"

export default function App() {
  const [cafes, setCafes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cafefavs")) || []
    } catch {
      return []
    }
  })

  const mapRef = useRef(null)
  const markerRefs = useRef({})

  useEffect(() => {
    const fetchCafes = async () => {
      setLoading(true)
      try {
        const overpassQuery = `[out:json][timeout:50];(
          node[amenity=cafe](${BBOX});
          way[amenity=cafe](${BBOX});
        ); out center;`
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
          overpassQuery
        )}`
        const { data } = await axios.get(url)

        const list = (data.elements || []).map((el) => {
          const latLon =
            el.type === "node"
              ? { lat: el.lat, lon: el.lon }
              : { lat: el.center.lat, lon: el.center.lon }
          return {
            id: `${el.type}/${el.id}`,
            name: el.tags?.name || "Unnamed Cafe",
            lat: latLon.lat,
            lon: latLon.lon,
          }
        })

        setCafes(list)
      } catch (err) {
        console.error("Overpass error", err)
        alert("Failed to fetch cafes — try again later.")
      } finally {
        setLoading(false)
      }
    }
    fetchCafes()
  }, [])

  useEffect(() => {
    localStorage.setItem("cafefavs", JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (cafe) => {
    setFavorites((prev) =>
      prev.some((f) => f.id === cafe.id)
        ? prev.filter((f) => f.id !== cafe.id)
        : [...prev, cafe]
    )
  }

  const isFav = (cafe) => favorites.some((f) => f.id === cafe.id)

  const goToCafe = (cafe) => {
    if (mapRef.current) {
      mapRef.current.flyTo([cafe.lat, cafe.lon], 16, { duration: 1.2 })
      const marker = markerRefs.current[cafe.id]
      if (marker) marker.openPopup()
    }
  }

  const filteredCafes = cafes.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "340px",
          background: "#f9fafb",
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
          padding: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
          ☕ Mumbai Cafes
        </h2>

        <input
          type="text"
          placeholder="Search cafes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.6rem",
            borderRadius: "8px",
            border: "1px solid #ccc",
            marginBottom: "1rem",
          }}
        />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Favorites Section */}
          <h3 style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
            ⭐ Favorites
          </h3>
          {favorites.length === 0 && <p>No favorites yet.</p>}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {favorites.map((cafe) => (
              <li
                key={cafe.id}
                style={{
                  background: "#fff7e6",
                  borderRadius: "8px",
                  padding: "0.8rem",
                  marginBottom: "0.6rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => goToCafe(cafe)}
              >
                <span>{cafe.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(cafe)
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                  }}
                >
                  {isFav(cafe) ? "★" : "☆"}
                </button>
              </li>
            ))}
          </ul>

          {/* All Cafes Section */}
          <h3 style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>All Cafes</h3>
          {loading && <p>Loading cafes...</p>}
          {!loading && filteredCafes.length === 0 && <p>No cafes found.</p>}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filteredCafes.map((cafe) => (
              <li
                key={cafe.id}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  padding: "0.8rem",
                  marginBottom: "0.6rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => goToCafe(cafe)}
              >
                <span>{cafe.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(cafe)
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                  }}
                >
                  {isFav(cafe) ? "★" : "☆"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Map */}
      <MapContainer
        center={[MUMBAI_CENTER.lat, MUMBAI_CENTER.lng]}
        zoom={12}
        style={{ flex: 1 }}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {cafes.map((cafe) => (
          <Marker
            key={cafe.id}
            position={[cafe.lat, cafe.lon]}
            ref={(ref) => {
              if (ref) markerRefs.current[cafe.id] = ref
            }}
          >
            <Popup>
              <strong>{cafe.name}</strong>
              <div style={{ marginTop: "0.5rem" }}>
                <button onClick={() => toggleFavorite(cafe)}>
                  {isFav(cafe) ? "★ Remove Favorite" : "☆ Add Favorite"}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
