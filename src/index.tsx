//@ts-nocheck
import { useRef, useEffect, useCallback, createContext, useReducer, useContext, useMemo } from "react";

// Cherche la data
export const useSelector = (selector: (state : any) => any) => {
  const state = useContext(StateContext).state
  return selector(state)
}

export const useMemSelector = (...args : [() => {}]) => {
  const combiner = args[args.length - 1] 
  const state = useContext(StateContext).state
  
  const results = useMemo(() => {
    const selectors = args.slice(0, -1)
    return selectors.map(selector => {
      return selector(state)
    })
  }, [...args, state]) //selectors ne changent pas souvent

  return useMemo(() => {
    return combiner(results)
  }, [...results, combiner])
}

// Récupère la fonction dispatch
export const useDispatch = () => useContext(StateContext).dispatch

// Creation du contexte
const StateContext = createContext({dispatch: (action : any) => null, state: {}})

interface IAction {
  type: string,
  [key : string] : unknown
}

interface IStore {
  [key : string] : (state : unknown, action : IAction) => unknown
}

interface IState {
  [key : string] : unknown
}

// Genere le state avec les fonction du store
const newStateFromStore = (store : IStore, state : IState, action : IAction) => {
  let newState = {} as IState
  Object.keys(store).map(key => newState[key] = store[key](state[key], action))
  return newState
}

const reducer = (state : IState, {action, store} : { action : IAction, store : IStore}) => {
  const newState = newStateFromStore(store, state, action)
  return Object.keys(newState).find(key => newState[key] !== state[key]) ? newState : state
} 

const initReducer = (store : IStore) => newStateFromStore(store, {}, {type: "__init"})

// Wrapper qui injecte le contexte
export const Provider = ({children, store, middlewares} : any) => {
  const [state, _dispatch] = useReducer(reducer, store, initReducer)
  const ref = useRef(state)

  useEffect(() => {
    ref.current = state
  }, [state])

  const dispatch = useCallback(
    (action) => {
      const getState = () => ref.current
      let index = 0
      const callNextMiddleware = () => {
        if ( index < middlewares.length ) {
          // call middleware at index
          middlewares[index](getState, action, dispatch, () => {
            index++
            callNextMiddleware()
          })  
        } else {
          _dispatch({action, store})
        }
      }

      callNextMiddleware()
    },
    []
  )

  return <StateContext.Provider value={{state, dispatch}}>
    {children}
  </StateContext.Provider>
}

export const logActionMiddleware = (getState, action, dispatch, next) => {
  console.log(getState(), action)
  next()
}

export const thunkMiddleware = (getState, action, dispatch, next) => {
  if (typeof action === "function") {
    action(dispatch, getState)
  } else {
    next()  
  }
}
  