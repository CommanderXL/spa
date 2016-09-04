/**
 * Created by XRene on 16/8/28.
 */

spa.fake = (function () {
    var peopleList, getPeopleList, fakeIdSerial, makeFakeId, mockSio;

    //添加模拟的服务端ID序号计数器
    fakeIdSerial = 5;

    //创建生成模拟的服务端ID字符串的方法
    makeFakeId = function () {
        return 'id_' + String(fakeIdSerial++);
    };

    peopleList = [
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
    ];

    mockSio = (function () {
        var on_sio, emit_sio, emit_mock_msg,
            send_listchange, listchange_idto,
            callback_map = {};

        on_sio = function (msg_type, callback) {
            callback_map[msg_type] = callback;
        };

        emit_sio = function (msg_type, data) {
            console.log(data);
            var person_map, i;
            //有新用户加入
            if(msg_type === 'adduser' && callback_map.userupdate) {
                setTimeout(function () {
                    person_map = {
                        _id: makeFakeId(),
                        name: data.name,
                        css_map: data.css_map
                    };
                    peopleList.push(person_map);
                    callback_map.userupdate([person_map]);
                }, 3000);
            }

            //延迟2s使用模拟的响应对发送的消息进行响应
            if(msg_type === 'updatechat' && callback_map.updatechat) {
                setTimeout(function () {
                    var user = spa.model.people.get_user();
                    callback_map.updatechat([{    //TODO 注意这里传入的数据类型, 传入的为一个数组
                        dest_id: user.id,
                        dest_name: user.name,
                        sender_id: data.dest_id,
                        msg_text: 'Thanks for the node, ' + user.name
                    }]);
                }, 2000);
            }

            //如果接收的信息为leavechat.则清除chat使用的回调函数.
            //包括聊天信息的更新,以及人员列表的更新
            if(msg_type === 'leavechat') {
                delete callback_map.listchange;
                delete callback_map.updatechat;

                if(listchange_idto) {
                    clearTimeout(listchange_idto);
                    listchange_idto = undefined;
                }
                send_listchange();
            }

            if(msg_type === 'updateavatar' && callback_map.listchange) {
                for(i = 0; i < peopleList.length; i++) {
                    if(peopleList[i]._id === data.person_id) {
                        peopleList[i].css_map = data.css_map;
                        break;
                    }
                }
                //updateavatar事件会触发listchange事件的发生
                callback_map.listchange([peopleList]);
            }
        };


        emit_mock_msg = function () {
            setTimeout(function () {
                var user = spa.model.people.get_user();
                if(callback_map.updatechat) {
                    callback_map.updatechat([{
                        dest_id: user.id,
                        dest_name: user.name,
                        sender_id: 'id_04',
                        msg_text: 'Hi there ' + user.name + '! Wilma here.'
                    }]);
                }
                else {emit_mock_msg();}
            }, 8000)
        };

        //try once per second to use listchange callback
        //Stop trying after first sucess
        send_listchange = function () {
            listchange_idto = setTimeout(function () {
                if(callback_map.listchange) {
                    callback_map.listchange([peopleList]);
                    //当用户登录后,每8s发送一条模拟数据
                    emit_mock_msg();
                    listchange_idto = undefined;
                } else {
                    send_listchange();
                }
            }, 1000);
        };

        send_listchange();

        return {
            emit: emit_sio,
            on: on_sio
        }
    })();

    return {
        mockSio: mockSio
    }
})();
