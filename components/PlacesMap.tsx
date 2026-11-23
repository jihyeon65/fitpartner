"use client";

// Design Ref: §3.5 지도·시설 검색 — 지도는 고른 구의 중심에 맞춰 보이고 시설마다 마커가 있다. 좌표 없는 시설은 마커가 없다.
//   지도 그림을 못 불러오면 안내만 보이고 시설 목록은 그대로 둔다. (타일 오류는 onTileError 로 알린다)
// Design Ref: §9 보안 — 지도에는 시설만 표시한다. (파트너·사용자 위치는 표시하지 않고, 구 중심 좌표만 쓴다)
//   마커 그림은 이미지 파일 없이 만든 모양(divIcon)이라 외부 서비스를 더 쓰지 않는다.
// Plan: 작업 17번 "지도·시설 검색 화면(N2)"
//
// Leaflet은 브라우저에서만 동작하므로 이 파일은 PlacesExplorer 에서 서버 렌더링 없이 불러온다. (빌드 실패 방지)
//
// 지도를 react-leaflet 부품이 아니라 Leaflet으로 직접 만든다. 다른 화면에 다녀온 뒤 이 화면이 다시 보일 때
//   (Next.js가 이전 화면을 숨겼다가 되살리는 방식) React가 이펙트를 "정리 → 다시 실행" 하는데,
//   지도를 만들고 지우는 일을 같은 이펙트 안에 짝으로 두면 이때도 지도가 새로 만들어져서 오류가 나지 않는다.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { DISTRICT_CENTERS } from "@/lib/districts";
import type { District, Place } from "@/lib/options";

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function markerIcon(selected: boolean): L.DivIcon {
  const size = selected ? 22 : 16;
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;border:3px solid #fff;background:${selected ? "#dc2626" : "#059669"};box-shadow:0 1px 4px rgba(0,0,0,.5)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onTileErrorRef = useRef(onTileError);
  const selected = places.find((place) => place.id === selectedId);

  // 아래 이펙트들은 선언한 순서대로 실행된다. (지도 만들기 → 중심 맞추기 → 마커 → 선택 시설로 이동)
  useEffect(() => {
    onTileErrorRef.current = onTileError;
  });

  // 지도를 만들고, 화면이 사라지거나 숨겨질 때 지운다.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const map = L.map(element, { scrollWheelZoom: false });
    L.tileLayer(OSM_URL, { attribution: OSM_ATTRIBUTION })
      .on("tileerror", () => onTileErrorRef.current())
      .addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 구가 바뀌면 그 구의 중심으로 옮긴다.
  useEffect(() => {
    const { lat, lng } = DISTRICT_CENTERS[district];
    mapRef.current?.setView([lat, lng], 13);
  }, [district]);

  // 좌표가 있는 시설에 마커를 올린다. (선택된 시설은 빨갛고 크게)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const group = L.layerGroup().addTo(map);
    for (const place of places) {
      if (place.lat === undefined || place.lng === undefined) continue;
      L.marker([place.lat, place.lng], { icon: markerIcon(place.id === selectedId), title: place.name })
        .on("click", () => onSelect(place.id))
        .addTo(group);
    }
    return () => {
      group.remove();
    };
  }, [places, selectedId, onSelect]);

  // 시설을 고르면 그 시설로 부드럽게 이동한다.
  useEffect(() => {
    if (selected?.lat !== undefined && selected.lng !== undefined) {
      mapRef.current?.flyTo([selected.lat, selected.lng], 15, { duration: 0.6 });
    }
  }, [selected]);

  return <div ref={containerRef} className="h-80 w-full rounded-lg md:h-[28rem]" />;
}
