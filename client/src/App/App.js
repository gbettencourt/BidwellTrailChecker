import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import './App.css';
import SignUp from './pages/SignUp';
import Unsubscribe from './pages/Unsubscribe';

class App extends Component {
  render() {
    const App = () => (
      <div>
        <Switch>
          <Route exact path='/' component={SignUp} />
          <Route path='/unsubscribe' component={Unsubscribe} />
        </Switch>
      </div>
    )
    return (
      <Switch>
        <App />
      </Switch>
    );
  }
}

export default App;
