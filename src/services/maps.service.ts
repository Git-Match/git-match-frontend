import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loaded = false;

export async function loadGoogleMaps() {
  if (loaded) return;

  setOptions({
    key: apiKey,
    libraries: ['places', 'marker', 'maps'],
  });

  await importLibrary('maps');
  await importLibrary('places');
  await importLibrary('marker');

  loaded = true;
}
