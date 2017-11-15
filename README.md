# react-redux-subapp

Create pluggable React/Redux sub-applications.

## Why?

When we have to use a React/Redux sub-application inside another React/Redux application, there are multiple entrypoints inside the sub-application (i.e. component, reducer, initial-state) which need to be composed by the parent application.  
It breaks the single place composibility nature provided by vanilla React architecture.
Also, this situation complicates if we want to dynamically import the sub-application's module (for code splitting purpose) because reducer provided by sub-application needs be added dynamically to make it work.  
This package mitigates these problems.

There is also a concern of state isolation for sub applications, which can be solved by having multiple stores.  
Using this package, we won't need to create multiple stores for Redux in a single application and still achieve state isolation. Let there be only single source of truth.

## Features

1) Provide single entrypoint for sub-application. Just use the component inside the parent application.
Associated reducer and initial-state are automatically taken care of.
2) Isolate state access for sub-application. The Sub-application doesn't get access to the parent store's whole state in both the reducer and the `mapStateToProps` function.
3) In case of code splitting (dynamic imports), the reducer is added dynamically to the parent application.
4) The location of sub-application's redux state inside the main store is decided by the parent application. The Sub-application doesn't need to worry about it.
5) The Parent app can use multiple isolated instances of sub-application at different places.
6) The Sub-application's saga can be attached and run dynamically.

## Install

```bash
npm install -S react-redux-subapp
```

## Getting started

Let's create a simple counter sub-application using Redux keeping only its sub-state in mind.

#### Initial State (initialState.js)

```js
export default {
  value: 0,
};
```

#### Reducer (reducer.js)

```js
export default function reducer(state, action) {
  switch (action.type) {
    case 'INCREMENT': {
      return {
        ...state,
        value: state.value + 1,
      };
    }
    default:
      return state;
  }
}
```

#### Component (component.js)

```js
import React from 'react';
import { connect } from 'react-redux';


const CounterView = ({ value, increment }) => (
  <p>
    Clicked: {value} times
    {' '}
    <button onClick={increment}>
      +
    </button>
  </p>
);

const mapStateToProps = state => ({
  value: state.value,
});

const mapDispatchToProps = dispatch => ({
  increment() {
    dispatch({ type: 'INCREMENT' });
  },
});

export const Counter = connect(mapStateToProps, mapDispatchToProps)(
                        CounterView);
```

#### (index.js)

Let's create a single sub-application entrypoint using `react-redux-subapp`:

```js
import { createAppFactory } from 'react-redux-subapp';

import initialState from './initialState';
import reducer from './reducer';

export const counterAppFactory = createAppFactory(
    Counter, reducer, initialState);
    
// Specifying the subAppKey='counter' where the counter's
// state would be located in main redux store.
export const CounterApp = counterAppFactory('counter');
```

### How to use it inside parent app?

The parent app just needs to put the enhancer provided by `react-redux-subapp` while creating store.
Then it can use the `CounterApp` as component.

#### Parent app's index.js

```js
import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { subAppEnhancer } from 'react-redux-subapp';

import { CounterApp as Counter } from 'counter-app';


const store = createStore((state => state), {}, subAppEnhancer);

ReactDOM.render((
  <Provider store={store}>
    <Counter />
  </Provider>
), document.getElementById('root'));
```

In the above example, the store has been created with an identity reducer (which does nothing) and an empty state.
In the real world, the parent app may contain its own reducer and initial state for its own functionality.
The `Counter` can be used in any component of the parent app.

After the `<Counter />` component mounts, the state of the store would look something like:

```js
{
  counter: {
    value: 0
  }
}
```

It used the `counter` key in main redux store because it was specified while creating `CounterApp` from `counterAppFactory`.


## Reference
This package provides two objects:

#### 1) `createAppFactory(component, reducer, initialState, options = {})`

Creates app factory provided component, reducer, initialState and options. `initialState` and `options` are optional.
If initialState is not provided then reducer must have it as default argument against `state` parameter.
If the sub app works on saga then it can be specified in options' `saga` key.

```js
const appFactory = createAppFactory(Component, reducer, initialState);
```

Which again is used to create App instances by providing the `subAppKey` as argument.

```js
const ComponentApp = appFactory(subAppKey);
```

`subAppKey` is a string. The string can contain `.` character to specify nesting of keys in store.

The `ComponentApp` can be used as a component while rendering.

The parent app can also create single/multiple `ComponentApp`s from `appFactory` in its own code according to its need to
where to keep their state in global redux store.


#### 2) `subAppEnhancer`

Put it as a third argument while creating Redux store in parent app.

E.g.

```js
import { subAppEnhancer } from 'react-redux-subapp';
const store = createStore(parentReducer, initialState, subAppEnhancer);
```

If you are using other enhancers or applyMiddleware, then compose the enhancers into one.

```js
import { createStore, applyMiddleware, compose } from 'redux';
import { subAppEnhancer } from 'react-redux-subapp';

const applyEnhancer = applyMiddleware(middleware1, middleware2);
const enhancer = compose(subAppEnhancer, applyEnhancer);
const store = createStore(parentReducer, initialState, enhancer);
```

## An example of dynamic import

**parent app's index.js** 

```js
import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { subAppEnhancer } from 'react-redux-subapp';


const store = createStore((state => state), {}, subAppEnhancer);

class CounterApps extends React.Component {
  constructor() {
    super();
    this.state = {
      CounterApp1: null,
      CounterApp2: null,
    };
  }
  componentDidMount() {
    if (this.state.CounterApp1 === null) {
      import('counter-app').then(({ counterAppFactory }) => {
        this.setState({
          CounterApp1: counterAppFactory('counter1'),
          CounterApp2: counterAppFactory('counter2'),
        });
      }).catch((error) => {/* Module loading failed */});
    }
  }
  render() {
    const { CounterApp1, CounterApp2 } = this.state;
    if (CounterApp1 === null) {
      return null;
    }
    return (
      <div>
        <CounterApp1 />
        <CounterApp2 />
      </div>
    );
  }
}

ReactDOM.render((
  <Provider store={store}>
    <CounterApps />
  </Provider>
), document.getElementById('root'));
```

The `CounterApp1` and `CounterApp2` created above will behave isolately.
Action dispatched from one component will be caught by the reducer of that component only.
The store's state after components mount will look like:

```js
{
    counter1: {
        value: 0,
    },
    counter2: {
        value: 0,
    }
}
```

## How to use it with Saga?

**child app's index.js**

You need to put sub application's saga generator function in 4th argument (`options`) of `createAppFactory` as follows:
```js
import { counterSaga } from './saga';

export const counterAppFactory = createAppFactory(
  Counter, reducer, initialState, {
    saga: counterSaga,
  }); 
```

**parent app's index.js**

Install `redux-subspace-saga` package too along with `redux-saga`.
```bash
npm install -S redux-subspace-saga
```

And import `createSagaMiddleware` from redux-subspace-saga instead of redux-saga.
You would have to use `subAppEnhancer.withOptions(options)` form instead of just `subAppEnhancer`.
```js
import { createStore, applyMiddleware, compose } from 'redux';
import { subAppEnhancer } from 'react-redux-subapp';
import createSagaMiddleware from 'redux-subspace-saga';

const sagaMiddleware = createSagaMiddleware();
const applyEnhancer = applyMiddleware(sagaMiddleware);
// Here you need to specify sagaMiddleware to subAppEnhancer
const subAppEnhancerInstance = subAppEnhancer.withOptions({
  sagaMiddleware: sagaMiddleware,
});
const enhancer = compose(applyEnhancer, subAppEnhancerInstance);
const store = createStore((state => state), {}, enhancer);
```

That's it.


## Anti-patterns

Don't create multiple `ComponentApp` objects from `appFactory` just because you need to render those
in different components. The single `ComponentApp` created can be rendered anywhere. So it is advised to create a
sub-application's `ComponentApp` statically inside the parent app and use it everywhere. Design the sub-application's components so that they can take some unique identifier prop from the parent and use a part of their own sub-state for any given identifier.

Creating mutiple `ComponentApp`s (dynamically) will cause a long chain of reducers, which can slow down your app.

## Acknowledgement

This package is made using two awesome packages [redux-subspace](https://github.com/ioof-holdings/redux-subspace)
and [redux-transient](https://github.com/lucasconstantino/redux-transient).
So features like isolated sub states and dynamic reducers are inherently provided by these packages.
This package is providing a React binding for it.

## Licence

MIT
