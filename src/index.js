import React from 'react';
import PropTypes from 'prop-types';
import hoistStatics from 'hoist-non-react-statics';
import { subspace, namespaced } from 'redux-subspace';
import { subspaced } from 'redux-subspace-saga';
import { addReducer } from 'redux-transient';

import { subAppEnhancer } from './enhancer';

export { subAppEnhancer } from './enhancer';

// Depricated
export const enhancer = subAppEnhancer;

const ACTION_INITIALIZE_REDUCER_TYPE = '@react-redux-subapp/INIT';

const initializeReducer = () => ({
  type: ACTION_INITIALIZE_REDUCER_TYPE,
});

const sagaRunForSubAppKeyMap = {};

const mapState = subAppKey => (state) => {
  let subState = state;
  const keys = subAppKey.split('.');
  keys.forEach((key) => {
    if (subState !== undefined) {
      subState = subState[key];
    }
  });
  return subState;
};

const subAppCreator = (subAppKey, WrappedComponent, reducer, options) => {
  const wrappedComponentName = WrappedComponent.displayName
    || WrappedComponent.name
    || 'Component';
  const displayName = `SubApp(${wrappedComponentName}, subAppKey=${subAppKey})`;

  class SubApp extends React.Component {
    getChildContext() {
      return {
        store: subspace(mapState(subAppKey), subAppKey)(this.getStore()),
      };
    }
    componentWillMount() {
      const store = this.getStore();
      store.dispatch(addReducer(reducer));
      store.dispatch(initializeReducer());
      if (options.saga && (!sagaRunForSubAppKeyMap[subAppKey])) {
        const subspacedSaga = subspaced(mapState(subAppKey), subAppKey)(options.saga);
        store.runSaga(subspacedSaga);
        sagaRunForSubAppKeyMap[subAppKey] = true;
      }
    }
    getStore() {
      let { store } = this.context;
      if (store.rootStore) {
        store = store.rootStore;
      }
      return store;
    }
    render() {
      return <WrappedComponent {...this.props} />;
    }
  }
  SubApp.propTypes = {};
  SubApp.contextTypes = {
    store: PropTypes.object.isRequired,
  };
  SubApp.childContextTypes = {
    store: PropTypes.object,
  };
  SubApp.WrappedComponent = WrappedComponent;
  SubApp.displayName = displayName;
  return hoistStatics(SubApp, WrappedComponent);
};


const refined = (subAppKey, reducer, initialState) => (state, action) => {
  let subState = mapState(subAppKey)(state);
  if (subState === undefined) {
    subState = initialState;
  }
  const keys = subAppKey.split('.');
  const resultState = {
    ...state,
  };
  let parentState = resultState;
  if (keys.length > 1) {
    keys.splice(0, keys.length - 1).forEach((key) => {
      if (parentState[key] === undefined) {
        parentState[key] = {};
      }
      parentState = parentState[key];
    });
  }
  parentState[keys[0]] = reducer(subState, action);
  return resultState;
};

const mapping = {};

export const createAppFactory = (WrappedComponent, reducer, initialState, options = {}) => (subAppKey) => {
  if (subAppKey in mapping) {
    if (mapping[subAppKey].wrapped === WrappedComponent) {
      return mapping[subAppKey].subApp;
    }
    throw new Error(`store's key=${subAppKey} is already mapped with another component ${mapping[subAppKey].wrapped}`);
  }
  const namespacedReducer = namespaced(subAppKey)(reducer);
  const refinedReducer = refined(subAppKey, namespacedReducer, initialState);
  const subApp = subAppCreator(subAppKey, WrappedComponent, refinedReducer, options);
  mapping[subAppKey] = {
    wrapped: WrappedComponent,
    subApp,
  };
  return subApp;
};
