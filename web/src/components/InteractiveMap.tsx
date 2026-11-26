"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { DTU_HQ } from "@/data/mock-campaign";
import { VillagePoint } from "@/types/volunteer-pulse";

interface InteractiveMapProps {
  villages: VillagePoint[];
  selectedVillageId: string | null;
  onSelectVillage: (id: string) => void;
  routeCoordinates?: Array<{ lat: number; lng: number; name: string; order: number }>;
  showRoute?: boolean;
}

export default function InteractiveMap({
  villages,
  selectedVillageId,
  onSelectVillage,
  routeCoordinates = [],
  showRoute = true,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const hasFittedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [15.56, 107.88],
      zoom: 9,
      zoomControl: false,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: "bottomleft" }).addTo(map);

    // Free OpenStreetMap tiles (zero API key watermarks)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors | VolunteerPulse",
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      hasFittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Draw convoy optimized route polyline
    if (showRoute && routeCoordinates.length > 1) {
      const latlngs = routeCoordinates.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(latlngs, {
        color: "#145DA0",
        weight: 3,
        opacity: 0.78,
        dashArray: "7 7",
      }).addTo(group);
    }

    // Origin marker: DTU HQ
    const hqIcon = L.divIcon({
      className: "vp-hq-pin",
      html: `<div style="background:#122B26;color:#fff;border:2px solid #fff;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 4px 14px rgba(18,43,38,0.28);">ĐH Duy Tân</div>`,
      iconSize: [96, 26],
      iconAnchor: [48, 13],
    });
    L.marker([DTU_HQ.lat, DTU_HQ.lng], { icon: hqIcon })
      .bindTooltip("Điểm xuất phát: Đại học Duy Tân, Đà Nẵng", { direction: "top" })
      .addTo(group);

    // Village markers
    villages.forEach((v) => {
      const isSelected = v.id === selectedVillageId;
      const bg =
        v.priority === "urgent"
          ? "#C84B24"
          : v.priority === "high"
            ? "#B4690E"
            : "#157A5B";

      const routeStop = routeCoordinates.find((r) => r.name === v.name);
      const badgeLabel = routeStop && showRoute ? `${routeStop.order}` : "";
      const size = isSelected ? 36 : 28;

      const icon = L.divIcon({
        className: "vp-village-pin",
        html: `<div style="
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          background:${bg};
          color:#fff;
          border:${isSelected ? "3px solid #122B26" : "2.5px solid #fff"};
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:${isSelected ? 13 : 11}px;
          font-weight:700;
          box-shadow:${isSelected ? "0 0 0 5px rgba(20,93,160,0.22), 0 6px 16px rgba(0,0,0,0.28)" : "0 3px 10px rgba(0,0,0,0.25)"};
          cursor:pointer;
          transition:transform 0.15s ease;
        ">${badgeLabel}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([v.lat, v.lng], { icon }).addTo(group);
      marker.on("click", () => onSelectVillage(v.id));
      marker.bindTooltip(`${v.name} — ${v.households} hộ`, {
        direction: "top",
        offset: [0, -14],
      });
    });

    if (!hasFittedRef.current) {
      const allPts: [number, number][] = [
        [DTU_HQ.lat, DTU_HQ.lng],
        ...villages.map((v) => [v.lat, v.lng] as [number, number]),
      ];
      if (allPts.length > 1) {
        // Extra right padding so pins sit cleanly to the left of the floating dossier drawer
        map.fitBounds(L.latLngBounds(allPts), {
          paddingTopLeft: [48, 120],
          paddingBottomRight: [430, 56],
          maxZoom: 10,
        });
        hasFittedRef.current = true;
      }
    }
  }, [villages, selectedVillageId, onSelectVillage, routeCoordinates, showRoute]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[560px]"
      aria-label="Bản đồ chiến dịch tình nguyện vùng cao Quảng Nam và Đà Nẵng"
    />
  );
}
