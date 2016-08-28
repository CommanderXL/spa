/**
 * Created by XRene on 16/8/28.
 */

spa.util = (function () {
    var makeError, setConfigMap;

    //constructor of error
    makeError = function (name_text, msg_text, data) {
        var error = new Error();
        error.name = name_text;
        error.message = msg_text;

        if(data) error.data = data;

        return error;
    };


    setConfigMap = function (arg_map) {
        var input_map = arg_map.input_map,
            settable_map = arg_map.settable_map,
            config_map = arg_map.config_map,
            key_name, error;

        for(key_name in input_map) {
            if(input_map.hasOwnProperty(key_name)) {
                if(settable_map.hasOwnProperty(key_name)) { //可配置的选项里面如果存在这个可配置的key,那么才能进行配置
                    config_map[key_name] = input_map[key_name];
                }
            } else {
                error = makeError('Bad Input', 'Setting config key | ' + key_name + ' | is not supported');
                throw error;
            }
        }
    }

    return {
        makeError: makeError,
        setConfigMap: setConfigMap
    }

})();