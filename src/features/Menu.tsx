import { Button, Toolbar } from "react95";
import "./Menu.css";

export const Menu = () => {
  return (
    <Toolbar className="menu-container">
      <Button variant="menu" size="sm">
        File
      </Button>
      <Button variant="menu" size="sm">
        Edit
      </Button>
      <Button variant="menu" size="sm" disabled>
        Save
      </Button>
    </Toolbar>
  );
};
