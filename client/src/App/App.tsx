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
          <Route path="/" element={<SignUp />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
        </Routes>
      </BrowserRouter>
    );
  }
}

export default App;
