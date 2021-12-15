import { AccountCircle, GitHub } from "@mui/icons-material";
import { AppBar, Toolbar, IconButton, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import React, { Component } from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import "./App.css";
import SignUp from "./pages/SignUp";
import Unsubscribe from "./pages/Unsubscribe";

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <SignUp />
              </Layout>
            }
          />
          <Route
            path="/unsubscribe"
            element={
              <Layout>
                <Unsubscribe />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    );
  }
}

const Layout = ({ children }) => (
  <div>
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Bidwell Trail Checker
        </Typography>

        <div>
          <IconButton
            size="large"
            aria-label="github link"
            aria-controls="menu-appbar"
            color="inherit"
            href="https://github.com/gbettencourt/BidwellTrailChecker"
          >
            <GitHub />
          </IconButton>
        </div>
      </Toolbar>
    </AppBar>
    {children}
  </div>
);

export default App;
