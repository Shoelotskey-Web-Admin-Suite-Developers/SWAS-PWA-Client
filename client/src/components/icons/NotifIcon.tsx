import { useState } from "react";
import Icon from '@/assets/icons/notifications.svg?react';


export default function NotifIcon() {
  const [hovered, setHovered] = useState(false);

  return (
      <Icon 
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fill: hovered ? '#CE1616' : '#1E1E1E',
          width: '24px',
          height: '24px',
          padding: '0 0 0 0',
        }}
      />
  );


}