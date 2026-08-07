import { useEffect, useMemo, useRef, useState } from "react";
import "@/styles/components/operationsNav.css";
import { Card, CardContent } from "@/components/ui/card";

const navItems = [
  { label: "Service Queue", icon: "bi-stack", step: 1 },
  { label: "Ready for Delivery", icon: "bi-truck", step: 2 },
  { label: "Incoming Delivery", icon: "bi-box-seam", step: 3 },
  { label: "In Warehouse", icon: "bi-building", step: 4 },
  { label: "Return to Branch", icon: "bi-arrow-counterclockwise", step: 5 },
  { label: "In Store", icon: "bi-shop-window", step: 6 },
  { label: "Ready for Pickup", icon: "bi-bag-check", step: 7 },
];

type OperationsNavProps = {
  onChange?: (index: number) => void;
  visibleTabs?: number[];
};

export default function OperationsNav({ onChange, visibleTabs }: OperationsNavProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightStyle, setHighlightStyle] = useState({ left: 0, width: 0 });

  const filteredNavItems = useMemo(
    () => (visibleTabs ? navItems.filter((_, idx) => visibleTabs.includes(idx)) : navItems),
    [visibleTabs]
  );

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
      <div className="pc-tab-nav">
        <Card className="!rounded-none card-nav operations-nav-card">
          <CardContent className="!p-0 card-content operations-nav-content" ref={containerRef}>
            <div
              className="highlight-bar"
              style={{ left: highlightStyle.left, width: highlightStyle.width }}
            />
            {filteredNavItems.map((item, index) => (
              <div key={index} className="nav-step-wrap">
                <div
                  className={`card-item ${index === activeIndex ? "active" : ""}`}
                  onClick={() => handleClick(index)}
                >
                  <span className="nav-icon">
                    <i className={`bi ${item.icon}`}></i>
                  </span>
                  <div className="nav-copy">
                    <span className="nav-step extra-bold">STEP {item.step}</span>
                    <h6 className="regular bold">{item.label}</h6>
                  </div>
                </div>
                {index < filteredNavItems.length - 1 && (
                  <span className="nav-divider" aria-hidden="true">
                    <i className="bi bi-chevron-right"></i>
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mobile-nav">
        <Card className="mobile-nav-card operations-mobile-nav-card">
          <CardContent>
            <div className="mobile-carousel">
              <button
                className="carousel-btn prev"
                onClick={() =>
                  handleClick(activeIndex === 0 ? navItems.length - 1 : activeIndex - 1)
                }
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <div className="mobile-carousel-item">
                <i className={`bi ${navItems[activeIndex].icon}`}></i>
                <h3 className="mobile-label">{navItems[activeIndex].label}</h3>
              </div>
              <button
                className="carousel-btn next"
                onClick={() =>
                  handleClick(activeIndex === navItems.length - 1 ? 0 : activeIndex + 1)
                }
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}