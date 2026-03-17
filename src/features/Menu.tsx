import { Button, Checkbox, MenuList, MenuListItem, Toolbar } from "react95";
import useMultiMenuPosition from "../hooks/useMultiMenuPosition";

import "./Menu.css";

type MenuItem = {
  checked?: boolean;
  text: string;
  action: () => void;
  items?: MenuItem[];
};

type MenuProps = {
  data: {
    [key: string]: MenuItem[];
  };
};

export const Menu = ({ data }: MenuProps) => {
  const { openMenu, closeMenu, menuRefs, toggleMenu, menuPosition } =
    useMultiMenuPosition();

  const handleMenuItemClick = (item: string) => {
    toggleMenu(item);
  };

  return (
    <Toolbar className="menu-container">
      {Object.keys(data).map((key: string) => {
        return (
          <Button
            variant="menu"
            size="sm"
            ref={(el) => {
              menuRefs.current[key] = el;
            }}
            onClick={() => handleMenuItemClick(key)}
          >
            {key}
          </Button>
        );
      })}
      {openMenu && (
        <MenuList
          className="menu-list"
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 1000,
            minWidth: "150px",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          {data[openMenu].map((item: MenuItem) => (
            <MenuListItem
              onClick={() => {
                item.action();
                closeMenu();
              }}
            >
              {item.checked !== undefined && (
                <Checkbox variant="flat" checked={!!item.checked} />
              )}
              {item.text}
              {item.items && ">"}
            </MenuListItem>
          ))}
        </MenuList>
      )}
    </Toolbar>
  );
};
