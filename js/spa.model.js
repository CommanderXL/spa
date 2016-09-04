/**
 * Created by XRene on 16/8/28.
 * sub file 桩文件
 */

spa.model = (function () {
    var
        configMap = {
            anon_id: 'a0'
        },
        stateMap = {
            anon_user: null,
            cid_serial: 0,  //id序号
            people_cid_map: {}, //保留people_cid_map键,用来保存person对象映射,键为客户端ID(cid)
            people_db: TAFFY(),  //保留TaffyDB集合,初始化为空
            user: null,
            is_connected: false //是否在聊天室
        },
        isFakeData = true,

        personProto, makeCid, clearPeopleDb, completeLogin,
        makePerson, removePerson, people, initModule, chat;


    //创建客户端id.如果person还未存到server,那么person是没有服务端id的
    makeCid = function () {
        return 'c' + String(stateMap.cid_serial++);
    };

    //TODO  ???
    clearPeopleDb = function () {
        var user = stateMap.user;
        stateMap.people_db = TAFFY();
        stateMap.people_cid_map = {};
        if(user) {
            stateMap.people_db.insert(user);
            stateMap.people_cid_map[user.cid] = user;
        }
    };

    //登录完成,后端返回所有的user列表
    completeLogin = function (user_list) {
        var user_map = user_list[0];
        delete stateMap.people_cid_map[user_map.cid];

        stateMap.user.cid = user_map._id;
        stateMap.user.id = user_map._id;
        stateMap.user.css_map = user_map.css_map;
        stateMap.people_cid_map[user_map._id] = stateMap.user;

        console.log(stateMap.user);

        //用户完成登入后就会自动加入聊天室
        chat.join();

        //when we add chat, we should join here
        //事件分发
        $.gevent.publish('spa-login', [stateMap.user]);
    };


    //原型对象
    personProto = {
        get_is_user: function () {
            return this.cid === stateMap.user.cid;
        },
        get_is_anon: function () {
            return this.cid === stateMap.anon_user.cid;
        }
    };

    //创建person对象的方法,并将新创建的对象保存到TaffyDB集合里面.也要确保更新people_cid_map里面的索引
    makePerson = function (person_map) {
        var person,
            cid = person_map.cid,
            css_map = person_map.css_map,
            id = person_map.id,
            name = person_map.name;

        if(cid === undefined || !name) {
            throw 'client id and name required';
        }

        person = Object.create(personProto);
        person.cid = cid;
        person.css_map = css_map;
        person.name = name;

        if(id) person.id = id;

        stateMap.people_cid_map[cid] = person;  //stateMap里面也会保存

        stateMap.people_db.insert(person);

        return person;
    };

    //从人员列表移除person对象的方法
    removePerson = function (person) {
        if(!person) return false;
        //不能移除匿名的person对象
        if(person.id === configMap.anon_id) {
            return false;
        }

        stateMap.people_db({cid: person.id}).remove();
        if(person.cid) {
            delete stateMap.people_cid_map[person.cid];
        }
        return true;
    };

    //定义people对象
    people = (function () {
        var get_by_cid, get_db, get_user, login, logout;

        //获取用户cid
        get_by_cid = function (cid) {
            return stateMap.people_cid_map[cid];
        };

        //获取所有数据信息
        get_db = function () {
            return stateMap.people_db;
        };

        //获取当前user
        get_user = function () {
            return stateMap.user;
        };

        //登录
        login = function (name) {
            //新建socketIO对象
            var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

            stateMap.user = makePerson({
                cid: makeCid(),
                css_map: {top: 25, left: 25, 'background-color': '#8f8'},
                name: name
            });


            //响应userupdate事件, 即后端接收到的用户信息触发一个事件
            sio.on('userupdate', completeLogin);

            //socketIO触发adduser事件
            sio.emit('adduser', {
                cid: stateMap.user.cid,
                css_map: stateMap.user.css_map,
                name: stateMap.user.name
            })
        };

        //登出
        logout = function () {
            var user = stateMap.user;

            //离开聊天室
            chat._leave();

            //is_removed = removePerson(user);
            //用户登出后变成了匿名用户
            stateMap.user = stateMap.anon_user;

            //在登出时清除人员集合
            clearPeopleDb();

            //发布spa-logout事件
            $.gevent.publish('spa-logout', [user]);
            return is_removed;
        };

        //导出people对象的所有公开方法
        return {
            get_by_cid: get_by_cid,
            get_db: get_db,
            get_user: get_user,
            login: login,
            logout: logout
        }
    })();

    chat = (function () {
        var _publish_listchange, _publish_updatechat,
            _update_list, _leave_chat,
            get_chatee, send_msg, set_chatee,
            join_chat, chatee = null, update_avatar;

        //接收新的人员列表,刷新people对象
        _update_list = function (arg_list) {
            var i, person_map, make_person_map, person,
                people_list = arg_list[0],
                is_chatee_online = false;

            //清楚people列表
            clearPeopleDb();

            PERSON:
            for(i = 0; i < people_list.length; i++) {
                person_map = people_list[i];

                if(!person_map.name) {continue PERSON};

                if(stateMap.user && stateMap.user.id === person_map._id) {
                    stateMap.user.css_map = person_map.css_map;
                    continue PERSON;
                }

                make_person_map = {
                    cid: person_map._id,
                    css_map: person_map.css_map,
                    id: person_map._id,
                    name: person_map.name
                };
                person = makePerson(make_person_map);


                if(chatee && chatee.id === make_person_map.id) {
                    is_chatee_online = true;
                    chatee = person;    //如果找到了听者,就更新为新的对象
                }

                //makePerson(make_person_map);
            }

            //更新数据库内容
            stateMap.people_db.sort('name');

            //如果chatee不在线,将chatee置空
            //这将会触发spa-setchatee全局事件
            if(chatee && !is_chatee_online) {set_chatee('');}
        };

        //携带的数据为更新后的人员列表,接收到来自后端的消息时会触发这段代码
        _publish_listchange = function (arg_list) {
            _update_list(arg_list);

            $.gevent.publish('spa-listchange', [arg_list]);
        };

        //发布spa-updatechat事件,携带的数据是消息的详细消息的映射
        _publish_updatechat = function (arg_list) {
            var msg_map = arg_list[0];
            console.log(msg_map);

            if(!chatee) {set_chatee(msg_map.sender_id)}
            else if(msg_map.sender_id !== stateMap.user.id && msg_map.sender_id !== chatee.id) {
                set_chatee(msg_map.sender_id);
            }

            $.gevent.publish('spa-updatechat', [msg_map]);
        };


        //向后端发送leavechat方法,并清除当前用户状态
        _leave_chat = function () {
            var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
            chatee = null;

            stateMap.is_connected = false;

            if(sio) sio.emit('leavechat');
        };

        //创建get_chatee方法,返回chatee人员对象
        get_chatee = function () {
            return chatee;
        };

        //加入list
        join_chat = function () {
            var sio;

            if(stateMap.is_connected) return false;
            //如果用户还是匿名的
            if(stateMap.user.get_is_anon()) {
                console.warn('User must be defined before joining chat');
                return false;
            }

            sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
            //在fake中添加listchange事件及其回调
            //当有人加入聊天室时,响应这个方法,并分发spa-listchange事件
            sio.on('listchange', _publish_listchange);
            //在fake中添加updatechat事件及其回调
            //绑定_publish_updatechat函数,处理从后端接收到的updatechat消息.
            //每当接收到消息的时候,会发布spa-updatechat事件
            sio.on('updatechat', _publish_updatechat);
            //更改用户状态
            stateMap.is_connected = true;
            return true;
        };

        //更新头像的方法
        update_avatar = function (avatar_update_map) {
            var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
            if(sio) {
                sio.emit('updateavatar', avatar_update_map);
            }
        };

        //创建send_msg方法,发送文本消息和相关的信息消息
        send_msg = function (msg_txt) {
            var msg_map,
                sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

            if(!sio) return false;
            if(!(stateMap.user && chatee)) return false;

            //把消息和相关的详细信息构造为映射
            msg_map = {
                dest_id: chatee.id,
                dest_name: chatee.name,
                sender_id: stateMap.user.id,
                msg_text: msg_txt
            };

            //TODO 源码这个地方会触发2次发送数据
            //发送消息, 发射updatechat事件
            _publish_updatechat([msg_map]);
            sio.emit('updatechat', msg_map);
            return true;
        };

        set_chatee = function (person_id) {
            var new_chatee;
            new_chatee = stateMap.people_cid_map[person_id];

            if(new_chatee) {
                if(chatee && chatee.id === new_chatee.id) {
                    return false;
                }
            } else {
                new_chatee = null;
            }

            //发布spa-setchatee事件,携带的数据是old_chatee和new_chatee
            $.gevent.publish('spa-setchatee', {old_chatee: chatee, new_chatee: new_chatee});
            chatee = new_chatee;
            return true;
        };

        //向外暴露leave和Join方法
        return {
            _leave: _leave_chat,
            join: join_chat,
            get_chatee: get_chatee,
            send_msg: send_msg,
            set_chatee: set_chatee,
            update_avatar: update_avatar
        }
    })();


    initModule = function () {
        var i, people_list, person_map;

        //添加的匿名user
        stateMap.anon_user = makePerson({
            cid: configMap.anon_id,
            id: configMap.anon_id,
            name: 'anonymous'
        });

        stateMap.user = stateMap.anon_user;

        //从fake模块获取的数据
        /*if(isFakeData) {
            people_list = spa.fake.getPeopleList();
            for(i = 0; i < people_list.length; i++) {
                person_map = people_list[i];
                makePerson({
                    cid: person_map._id,
                    css_map: person_map.css_map,
                    id: person_map._id,
                    name: person_map.name
                });
            }
        }*/
    };


    return {
        initModule: initModule,
        people: people,
        chat: chat
    }
})();
