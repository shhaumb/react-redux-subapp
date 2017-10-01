# react-redux-subapp

Create pluggable React/Redux sub-applications.

## Why?

When we have to use a React/Redux sub-application inside another React/Redux application,
there are multiple entrypoints inside sub-application (i.e. component, reducer, initial-state)
which need to be composed by parent application.
It breaks the single place composibility nature provided by vanilla React architecture.
Also, this situation complicates if we want to dynamically import the sub-application's module (for code splitting purpose)
because reducer provided by sub-application needs be added dynamically to make it work.
This package mitigates these problems.

There is also a concern of state isolation for sub applications, which can be solved by having multiple stores.
Using this package, we won't need to create multiple stores for Redux in a single application and
yet acheive state isolation. Let there be only single source of truth.

## Features

1) Provide single entrypoint for sub-application. Just use the component inside parent application.
Associated reducer and initial-state are taken care of automatically.
2) Isolate state access for sub-application. Sub-application doesn't get access to parent store's whole state
in both reducer and `mapStateToProps` function.
3) In case of code splitting (dynamic imports), reducer is added dynamically to parent application.
4) The location of sub-application's redux state inside main store is decided by the parent application.
Sub-application doesn't need to worry about it.
5) Parent app can use multiple isolated instances of sub-application at different places.


## Install

```
npm install -S react-redux-subapp
```

## Getting started

Let's create a simple counter sub-application using Redux keeping only its sub-state in mind.

#### Initial State (initialState.js)
```
export default {
  value: 0,
};
```

#### Reducer (reducer.js)
```
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
```
import React from 'react';
import { connect } from 'react-redux';


const CounterView = ({ value, increment }) => {
  return (
    <p>
      Clicked: {value} times
      {' '}
      <button onClick={increment}>
        +
      </button>
    </p>
  );
};

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

Let's create a single sub-application entrypoint using `react-redux-subapp`
```
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

The parent app just need to put the enhancer provided by `react-redux-subapp` while creating store.
Then it can use the `CounterApp` as component.

#### Parent app's index.js

```
import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { enhancer } from 'react-redux-subapp';

import { CounterApp as Counter } from 'counter-app';


const store = createStore((state => state), {}, enhancer);

ReactDOM.render((
  <Provider store={store}>
    <Counter />
  </Provider>
), document.getElementById('root'));
```

In above example, the store has been created with identity reducer (which does nothing) and an empty state.
In real world, the parent app may contain it's own reducer and initial-state for its own functionality.
The `Counter` can be used in any component of parent app.

After the `<Counter />` component mounts, the state of store would look something like:

```
{
  counter: {
    value: 0
  }
}
```
It used the `counter` key in main redux store because it was specified while creating `CounterApp` from `counterAppFactory`.


## Reference
This package provides two objects:

#### 1) `createAppFactory(component, reducer, [initialState])`

Creates app factory provided component, reducer and initialState (optional).
If initialState is not provided then reducer must have it as default argument against `state` parameter.

```
const appFactory = createAppFactory(Component, reducer, initialState);
```

Which again is used to create App instances by providing the `subAppKey` as argument.

```
const ComponentApp = appFactory(subAppKey);
```

Currently the `subAppKey` is just a string.

The ComponentApp can be used as a component while rendering.

The parent app can also create single/mutiple ComponentApp from appFactory in its own code according to its need to
where to keep their state in global redux store.


#### 2) `enhancer`

Put it as a third argument while creating Redux store in parent app.

E.g.

```
import { enhancer } from 'react-redux-subapp';
const store = createStore(parentReducer, initialState, enhancer);
```

If you are using other enhancers or applyMiddleware, then compose the enhancers into one.

```
import { createStore, applyMiddleware, compose } from 'redux';
import { enhancer as subAppEnhancer } from 'react-redux-subapp';

const applyEnhancer = applyMiddleware(middleware1, middleware2);
const enhancer = compose(subAppEnhancer, applyEnhancer);
const store = createStore(parentReducer, initialState, enhancer);
```

## Anti-patterns

Don't create mutiple ComponentApp objects from appFactory just because you need to render those
in different components. The single ComponentApp created can be rendered anywhere. So it is advised to create
sub-application's ComponentApp statically inside parent app and use it everywhere. Design sub-application's component
so that it can take some unique identifier prop from parent and use a part of its own sub-state for
given identifier.

Creating mutiple ComponentApp (dynamically) will cause a long chain of reducers, which can slow down your app.

## Acknowledgement

This package is made using two awesome packages [redux-subspace](https://github.com/ioof-holdings/redux-subspace)
and [redux-transient](https://github.com/lucasconstantino/redux-transient).
So features like isolated sub states and dynamic reducers are inherently provided by these packages.
This package is providing a React binding for it.

## Licence
MIT
