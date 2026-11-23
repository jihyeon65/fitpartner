"use client";

// Design Ref: §3.5 지도·시설 검색 — 지도는 고른 구의 중심에 맞춰 보이고 시설마다 마커가 있다. 좌표 없는 시설은 마커가 없다.
//   지도 그림을 못 불러오면 안내만 보이고 시설 목록은 그대로 둔다. 아래에 "© OpenStreetMap contributors" 출처를 표기한다.
// Design Ref: §9 보안 — 지도에는 시설만 표시한다. (파트너·사용자 위치는 표시하지 않고, 구 중심 좌표만 쓴다)
//   마커 그림은 이미지 파일 없이 만든 모양(divIcon)이라 외부 서비스를 더 쓰지 않는다.
// Plan: 작업 17번 "지도·시설 검색 화면(N2)"
//
// Leaflet은 브라우저에서만 동작하므로 이 파일은 PlacesExplorer 에서 서버 렌더링 없이 불러온다. (빌드 실패 방지)
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { DISTRICT_CENTERS } from "@/lib/districts";
import type { District, Place } from "@/lib/options";

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function markerIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${selected ? 22 : 16}px;height:${selected ? 22 : 16}px;border-radius:50%;border:3px solid #fff;background:${selected ? "#dc2626" : "#059669"};box-shadow:0 1px 4px rgba(0,0,0,.5)"></span>`,
    iconSize: [selected ? 22 : 16, selected ? 22 : 16],
    iconAnchor: [selected ? 11 : 8, selected ? 11 : 8],
  });
}

/** 구가 바뀌면 그 구의 중심으로, 시설을 고르면 그 시설로 지도를 옮긴다. */
function MapMover({ district, selected }: { district: District; selected: Place | undefined }) {
  const map = useMap();
  useEffect(() => {
    const { lat, lng } = DISTRICT_CENTERS[district];
    map.setView([lat, lng], 13);
  }, [map, district]);
  useEffect(() => {
    if (selected?.lat !== undefined && selected.lng !== undefined) {
      map.flyTo([selected.lat, selected.lng], 15, { duration: 0.6 });
    }
  }, [map, selected]);
  return null;
}

export default function PlacesMap({
  district,
  places,
  selectedId,
  onSelect,
  onTileError,
}: {
  district: District;
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTileError: () => void;
}) {
  const center = DISTRICT_CENTERS[district];
  const selected = places.find((place) => place.id === selectedId);
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-80 w-full rounded-lg md:h-[28rem]"
    >
      <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} eventHandlers={{ tileerror: onTileError }} />
      <MapMover district={district} selected={selected} />
      {places.map((place) =>
        place.lat !== undefined && place.lng !== undefined ? (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={markerIcon(place.id === selectedId)}
            title={place.name}
            eventHandlers={{ click: () => onSelect(place.id) }}
          />
        ) : null,
      )}
    </MapContainer>
  );
}
