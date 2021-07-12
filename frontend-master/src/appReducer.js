import {combineReducers} from 'redux';

const demoReducer = function demo(state = {}, action) {
	return state;
};
export default combineReducers({demo: demoReducer});
