import React, { useState, useRef, useEffect } from "react";
import "@/styles/components/operationsNav.css";
import { Card, CardContent } from "@/components/ui/card";

import IconSQ from "@/assets/icons/op-service-queue.svg?react";
import IconRD from "@/assets/icons/op-ready-delivery.svg?react";
import IconBD from "@/assets/icons/op-branch-delivery.svg?react";
import IconW from "@/assets/icons/op-warehouse.svg?react";
import IconRB from "@/assets/icons/op-return.svg?react";
import IconW2 from "@/assets/icons/op-warehouse-2.svg?react";
import IconP from "@/assets/icons/op-pickup.svg?react";

const navItems = [
  { label: "Service Queue", icon: <IconSQ /> },
  { label: "Ready for Delivery", icon: <IconRD /> },
  { label: "Incoming Branch Delivery", icon: <IconBD /> },
  { label: "In Warehouse", icon: <IconW /> },
  { label: "Return to Branch", icon: <IconRB /> },
  { label: "In Store", icon: <IconW2 /> },
  { label: "Ready for Pickup", icon: <IconP /> },
];

type OperationsNavProps = {
  onChange?: (index: number) => void;
  visibleTabs?: number[]; // Add this prop
};

export default function OperationsNav({ onChange, visibleTabs }: OperationsNavProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightStyle, setHighlightStyle] = useState({ left: 0, width: 0 });

  // Filter navItems based on visibleTabs
  const filteredNavItems = visibleTabs
    ? navItems.filter((_, idx) => visibleTabs.includes(idx))
    : navItems;

  const handleClick = (index: number) => {
    setActiveIndex(index);
    if (onChange) onChange(visibleTabs ? visibleTabs[index] : index);
  };

  useEffect(() => {
    function updateHighlight() {
      if (!containerRef.current) return;
      const items = containerRef.current.querySelectorAll(".card-item");
      const item = items[activeIndex] as HTMLElement;
      if (!item) return;

      let left = item.offsetLeft;
      let width = item.offsetWidth;
      const allowance = 7;

      if (activeIndex === 0) left = allowance;
      if (activeIndex === items.length - 1) {
        const containerWidth = containerRef.current.offsetWidth;
        width = containerWidth - item.offsetLeft - allowance;
      }

      setHighlightStyle({ left, width });
    }

    updateHighlight();

    const observer = new ResizeObserver(() => updateHighlight());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeIndex, filteredNavItems.length]);

  return (
    <div className="main-wrapper">
      {/* PC Tab Nav */}
      <div className="pc-tab-nav">
        <Card className="rounded-full card-nav">
          <CardContent className="card-content" ref={containerRef}>
            <div
              className="highlight-bar"
              style={{ left: highlightStyle.left, width: highlightStyle.width }}
            />
            {filteredNavItems.map((item, index) => (
              <div
                key={index}
                className={`card-item ${index === activeIndex ? "active" : ""}`}
                onClick={() => handleClick(index)}
              >
                {item.icon}
                <h6 className="regular">{item.label}</h6>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Nav */}
      <div className="mobile-nav">
        <Card className="mobile-nav-card">
          <CardContent>
            <div className="mobile-carousel">
              <button
                className="carousel-btn prev"
                onClick={() =>
                  handleClick(activeIndex === 0 ? navItems.length - 1 : activeIndex - 1)
                }
              >
                ◀
              </button>
              <div className="mobile-carousel-item">
                {navItems[activeIndex].icon}
                <h3 className="mobile-label">{navItems[activeIndex].label}</h3>
              </div>
              <button
                className="carousel-btn next"
                onClick={() =>
                  handleClick(activeIndex === navItems.length - 1 ? 0 : activeIndex + 1)
                }
              >
                ▶
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
