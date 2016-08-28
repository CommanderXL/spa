/**
 * Created by XRene on 16/8/28.
 * 浏览器工具方法
 */

spa.util_b = (function () {
    var
        configMap = {
            regex_encode_html: /[&"'><]/g,
            regex_encode_noamp: /["'><]/g,
            html_encode_map: {
                '&': '&#38;',
                '"': '&#34;',
                "'": '&#39;',
                '>': '&#62;',
                '<': '&#60;'
            }
        },
        decodeHtml, encodeHtml, getEmSize;

    //TODO  创建一份修改后的配置的副本,用于编码实体(encode entities)
    configMap.encode_noamp_map = $.extend({}, configMap.html_encode_map);

    //TODO 但是要移除&符号
    delete configMap.encode_noamp_map['&'];


    //解码, 以浏览器比较友好的方法将HTML实体进行解码
    decodeHtml = function (str) {
        return $('<div />').html(str || '').text();
    };

    //创建encodeHtml方法,把特殊字符(如&)转换成html编码值(如&amp)
    encodeHtml = function (input_arg_str, exclude_amp) {
        var
            input_str = String(input_arg_str),
            regex, lookup_map;

        if(exclude_amp) {
            lookup_map = configMap.encode_noamp_map;
            regex = configMap.regex_encode_noamp;
        } else {
            lookup_map = configMap.html_encode_map;
            regex = configMap.regex_encode_html;
        }

        return input_str.replace(regex, function (match, name) {
            return lookup_map[match] || '';
        })
    };

    // 1em = ..px 转换单位
    getEmSize = function (ele) {
        return Number(getComputedStyle(ele, '').fontSize.match(/\d*\.?\d*/)[0]);
    };

    return {
        decodeHtml: decodeHtml,
        encodeHtml: encodeHtml,
        getEmSize: getEmSize
    }
})();