import React from 'react';
import PropTypes from 'prop-types';
import hoistStatics from 'hoist-non-react-statics';
import { subspace, namespaced } from 'redux-subspace';
import { addReducer } from 'redux-transient';

export { enhancer } from 'redux-transient';


const ACTION_INITIALIZE_REDUCER_TYPE = '@react-redux-subapp/INIT';

const initializeReducer = () => ({
  type: ACTION_INITIALIZE_REDUCER_TYPE,
});

const subAppCreator = (subAppKey, WrappedComponent, reducer) => {
  const wrappedComponentName = WrappedComponent.displayName
    || WrappedComponent.name
    || 'Component';
  const displayName = `SubApp(${wrappedComponentName}, subAppKey=${subAppKey})`;

  class SubApp extends React.Component {
    getChildContext() {
      let store = this.context.store;
      if (store.rootStore) {
        store = store.rootStore;
      }

      store.dispatch(addReducer(reducer));
      store.dispatch(initializeReducer());

      return {
        store: subspace((state => state[subAppKey]), subAppKey)(store),
      };
    }
    render() {
      return <WrappedComponent {...this.props} />;
    }
  }
  SubApp.PropTypes = {};
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
  let subState = state[subAppKey];
  if (subState === undefined) {
    subState = initialState;
  }
  if (subState === undefined) {
    subState = reducer(undefined, ACTION_INITIALIZE_REDUCER_TYPE);
  }
  return {
    ...state,
    [subAppKey]: ((action.type === ACTION_INITIALIZE_REDUCER_TYPE)
      ? subState
      : reducer(subState, action)),
  };
};

export const createAppFactory = (WrappedComponent, reducer, initialState) => (subAppKey) => {
  const namespacedReducer = namespaced(subAppKey)(reducer);
  const refinedReducer = refined(subAppKey, namespacedReducer, initialState);
  return subAppCreator(subAppKey, WrappedComponent, refinedReducer);
};
