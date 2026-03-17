import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X, Navigation } from 'lucide-react';
import { loadGoogleMaps } from '../../services/maps.service';
import type { UserGeolocation } from '../../services/location.service';

interface LocationUpdateModalProps {
  onClose: () => void;
  onSave: (newLocation: UserGeolocation) => void;
  currentLocation: UserGeolocation | null;
}

const DEFAULT_MAP_CENTER = { lat: 51.5074, lng: -0.1278 };

const formatLocationLabel = (location: UserGeolocation | null) =>
  [location?.city, location?.country].filter(Boolean).join(', ');

const getAddressComponent = (components: google.maps.GeocoderAddressComponent[], types: string[]) =>
  components.find((component) => types.some((type) => component.types.includes(type)))?.long_name ??
  '';

export const LocationUpdateModal: React.FC<LocationUpdateModalProps> = ({
  onClose,
  onSave,
  currentLocation,
}) => {
  const [location, setLocation] = useState(currentLocation);
  const [loading, setLoading] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    setLocation(currentLocation);
  }, [currentLocation]);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      await loadGoogleMaps();

      if (!isMounted || !mapRef.current || map) return;

      const hasSavedCoordinates =
        currentLocation !== null && (currentLocation.lat !== 0 || currentLocation.lng !== 0);
      const initialCenter = hasSavedCoordinates
        ? { lat: currentLocation.lat, lng: currentLocation.lng }
        : DEFAULT_MAP_CENTER;

      const initialMap = new google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: 12,
        disableDefaultUI: true,
      });

      initialMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        void handleMapClick(e.latLng, initialMap);
      });

      if (hasSavedCoordinates) {
        markerRef.current = new google.maps.Marker({
          position: initialCenter,
          map: initialMap,
        });
      }

      setMap(initialMap);
    }

    void initMap();

    return () => {
      isMounted = false;
      markerRef.current?.setMap(null);
    };
  }, []);

  const handleMapClick = async (
    latLng: google.maps.LatLng | null | undefined,
    mapInstance: google.maps.Map
  ) => {
    if (!latLng) return;

    // Remove old marker
    markerRef.current?.setMap(null);

    // Place new marker
    const newMarker = new google.maps.Marker({
      position: latLng,
      map: mapInstance,
    });
    markerRef.current = newMarker;

    handleMapPanToLocation(latLng, mapInstance);

    await handleGeocoder(latLng);
  };

  const handleGeocoder = async (
    latLng: google.maps.LatLng | null | undefined
  ): Promise<UserGeolocation | null> => {
    if (!latLng) {
      return null;
    }

    const geocoder = new google.maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const addressComponents = results[0].address_components;
          const resolvedLocation: UserGeolocation = {
            city: getAddressComponent(addressComponents, [
              'locality',
              'postal_town',
              'administrative_area_level_2',
              'sublocality',
              'sublocality_level_1',
              'administrative_area_level_1',
            ]),
            country: getAddressComponent(addressComponents, ['country']),
            lat: latLng.lat(),
            lng: latLng.lng(),
          };

          setLocation(resolvedLocation);
          resolve(resolvedLocation);
        } else {
          console.error('Geocode failed: ' + status);
          resolve(null);
        }
      });
    });
  };

  const handleMapPanToLocation = async (
    latLng: google.maps.LatLng | null | undefined,
    mapInstance: google.maps.Map
  ) => {
    if (!latLng) return;
    mapInstance.setZoom(14);
    mapInstance.panTo(latLng);
    setTimeout(() => {
      mapInstance.setZoom(15);
    }, 500);
  };

  const handleDetectLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = new google.maps.LatLng(latitude, longitude);

        try {
          if (map) {
            await handleMapClick(latLng, map);
          } else {
            await handleGeocoder(latLng);
          }
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error(error);
        alert('Unable to retrieve your location');
        setLoading(false);
      }
    );
  };

  const canSave =
    location !== null &&
    location.city.trim() !== '' &&
    location.country.trim() !== '' &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#1c1b2e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h3 className="text-xl font-bold text-white">Update Location</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Current Location</label>
            <div className="relative">
              <MapPin
                className="absolute top-1/2 left-3 -translate-y-1/2 text-purple-400"
                size={18}
              />
              <input
                type="text"
                disabled
                value={formatLocationLabel(location)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-4 pl-10 text-white focus:border-purple-500 focus:outline-none"
                placeholder="Enter city, country"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-4">
            <div className="h-px w-full bg-white/10"></div>
            <span className="text-xs text-gray-500 uppercase">Or</span>
            <div className="h-px w-full bg-white/10"></div>
          </div>

          {/* Map Container */}
          <div className="flex h-100 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <div className="my-4 h-full w-full overflow-hidden rounded-xl" ref={mapRef}></div>
          </div>

          {/* Detect Location Button */}
          <button
            onClick={handleDetectLocation}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-600/20 py-3 text-sm font-semibold text-purple-300 transition-colors hover:bg-purple-600/30 disabled:opacity-50"
          >
            {loading ? (
              <span>Detecting...</span>
            ) : (
              <>
                <Navigation size={16} /> Use Current Location
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 bg-black/20 p-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (location) {
                onSave(location);
              }
            }}
            disabled={!canSave}
            className="flex-1 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
