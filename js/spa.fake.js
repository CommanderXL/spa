/**
 * Created by XRene on 16/8/28.
 */

spa.fake = (function () {
    var getPeopleList, fakeIdSerial, makeFakeId, mockSio;

    //添加模拟的服务端ID序号计数器
    fakeIdSerial = 5;

    //创建生成模拟的服务端ID字符串的方法
    makeFakeId = function () {
        return 'id_' + String(fakeIdSerial++);
    };

    getPeopleList = function () {
        return [
            {
                name: 'Btter',
                _id: 'id_01',
                css_map: {
                    top: 20,
                    left: 20,
                    background: 'rgb(128, 128, 128)'
                }
            },
            {
                name: 'Mike',
                _id: 'id_02',
                css_map: {
                    top: 60,
                    left: 20,
                    background: 'rgb(128, 255, 128)'
                }
            },
            {
                name: 'Pebbles',
                _id: 'id_03',
                css_map: {
                    top: 100,
                    left: 20,
                    background: 'rgb(128,192, 192)'
                }
            }
        ]
    };

    mockSio = (function () {
        var on_sio, emit_sio, callback_map = {};

        on_sio = function (msg_type, callback) {
            callback_map[msg_type] = callback;
        };

        emit_sio = function (msg_type, data) {
            if(msg_type === 'adduser' && callback_map.userupdate) {
                setTimeout(function () {
                    callback_map.userupdate([{
                        id: makeFakeId(),
                        name: data.name,
                        css_map: data.css_map
                    }]);
                }, 3000);
            }
        }

        return {
            emit: emit_sio,
            on: on_sio
        }
    })();

    return {
        getPeopleList: getPeopleList,
        mockSio: mockSio
    }
})();
