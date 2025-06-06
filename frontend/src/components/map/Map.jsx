import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { getSunrise, getSunset } from 'sunrise-sunset-js';
import 'leaflet/dist/leaflet.css';
import './Map.css';
import L from 'leaflet';

const customIcon = L.icon({
    iconUrl: '../../../marker.png',
    iconSize: [40, 40],
    popupAnchor: [0,0]
});

const Map = () => {
    const LocationMarker = () => {
        const [position, setPosition] = useState(null);
        const [sunrise, setSunrise] = useState(null);
        const [sunset, setSunset] = useState(null);
        const [geminiResponse, setGeminiResponse] = useState({});

        const map = useMapEvents({
            click() {
                map.locate();
            },
            locationfound(e) {
                setPosition(e.latlng);
                map.flyTo(e.latlng, map.getZoom());
                const sunrise = getSunrise(e.latlng.lat, e.latlng.lng, new Date());
                const sunset = getSunset(e.latlng.lat, e.latlng.lng, new Date());
                setSunrise(sunrise);
                setSunset(sunset);
                generateResponse(e.latlng, sunrise, sunset).then((data) => insertData(data));
                // generateResponse(e.latlng, sunrise, sunset)
            },
        });

        const generateResponse = async (position, sunrise, sunset) => {
            const lat = position.lat;
            const long = position.lng;
            const rise = sunrise.toLocaleString('us-NY');
            const set = sunset.toLocaleString('us-NY');
            const request = `latitude: ${lat},
                            longitude: ${long}, 
                            sunrise: ${rise},
                            sunset: ${set},`
            try {
                const response = await fetch('http://localhost:5000/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ request })
                });

                if (!response.ok) {
                    throw new Error("Failed to generate response");
                }

                const data = await response.json();
                const dataObj = JSON.parse(data.responseMessage.replace(/```(?:json)?/g, ""));

                const returnedData = {
                    latitude: dataObj.latitude,
                    longitude: dataObj.longitude,
                    givenLocation: dataObj.givenLocation,
                    foundLocation: dataObj.foundLocation,
                    givenSunrise: sunrise.toLocaleTimeString(),
                    givenSunset: sunset.toLocaleTimeString(),
                    foundSunrise: dataObj.sunrise,
                    foundSunset: dataObj.sunset,
                    foundLong: dataObj.foundLocationLong,
                    foundLat: dataObj.foundLocationLat
                };

                setGeminiResponse(returnedData);
                
                return returnedData;

            } catch (error) {
                console.error("Error generating response", error);
            }
        };

        const insertData = async (insert) => {
            try {
                const response = await fetch('http://localhost:5000/insertData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(insert)
                });

                if (!response.ok) {
                    throw new Error("Failed to insert data in database");
                }

                const data = await response.json();
            } catch (error) {
                console.error("Error inserting data into database", error);
            }
        }


        return position === null ? null : (
            <Marker position={position} icon={customIcon}>
                <Popup id="map_popup">
                    <div className="map_popup_container">
                        {geminiResponse ?(
                            <>
                                <p>
                                    {geminiResponse.givenLocation}<br/>
                                    Rise: {geminiResponse.givenSunrise} | Set: {geminiResponse.givenSunset}<br/><br/>
                                    Similar Location: <br/>{geminiResponse.foundLocation}
                                </p>
                            </>
                        ) : (
                            <>
                                <h2>Ye Found Yer Booty!</h2>
                                <p>
                                    <strong>Sunrise</strong> { sunrise ? sunrise.toLocaleString('us-NY') : '' }<br />
                                    <strong>Sunset</strong> { sunset ? sunset.toLocaleString('us-NY') : '' }
                                </p>
                            </>
                        )}
                        
                    </div>
                </Popup>
            </Marker>
        )
    }

    return (
        <>
            <MapContainer
                center={{ lat: 42.355, lng: -71.056 }}
                zoom={13}
                scrollWheelZoom={true}>
                <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker />
            </MapContainer>
        </>
    );
}

export default Map;