import { useState, useRef, useEffect, useCallback } from "react";

interface MenuPosition {
  top: number;
  left: number;
}

interface UseMultiMenuReturn {
  openMenu: string | null;
  menuPosition: MenuPosition;
  menuRefs: React.RefObject<Record<string, HTMLButtonElement | null>>;
  toggleMenu: (menuId: string) => void;
  closeMenu: () => void;
}

const useMultiMenuPosition = (): UseMultiMenuReturn => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
  });

  // Single ref object to store all menu button refs
  const menuRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const toggleMenu = useCallback((menuId: string) => {
    const buttonRef = menuRefs.current[menuId];

    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom,
        left: rect.left,
      });

      // Close if clicking the same menu, open if different
      setOpenMenu((prevMenu) => (prevMenu === menuId ? null : menuId));
    }
  }, []);

  const closeMenu = useCallback(() => {
    setOpenMenu(null);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openMenu) return;

      const currentButton = menuRefs.current[openMenu];
      const target = event.target as Node;

      // Check if click is outside the current menu button
      if (currentButton && !currentButton.contains(target)) {
        // Check if click is inside any menu list
        const isClickInsideMenu = (event.target as Element)?.closest(
          ".menu-list",
        );
        if (!isClickInsideMenu) {
          setOpenMenu(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  return {
    openMenu,
    menuPosition,
    menuRefs,
    toggleMenu,
    closeMenu,
  };
};

export default useMultiMenuPosition;
