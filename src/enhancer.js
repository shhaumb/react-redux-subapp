import { transientEnhancer } from 'redux-transient';


const subAppEnhancerWithOptions = (options = {}) => createStore => (reducer, preloaded, enhancer) => {
  const store = transientEnhancer(createStore)(reducer, preloaded, enhancer);

  return {
    ...store,
    runSaga(saga) {
      if (options.sagaMiddleware === undefined) {
        console.error('sagaMiddleware should be provided in subAppEnhancer');
      } else {
        options.sagaMiddleware.run(saga);
      }
    },
  };
};

export const subAppEnhancer = subAppEnhancerWithOptions();
subAppEnhancer.withOptions = subAppEnhancerWithOptions;
