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
            user: null
        },
        isFakeData = true,

        personProto, makeCid, clearPeopleDb, completeLogin,
        makePerson, removePerson, people, initModule;


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
            var is_removed, user = stateMap.user;

            is_removed = removePerson(user);
            //用户登出后变成了匿名用户
            stateMap.user = stateMap.anon_user;

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
        if(isFakeData) {
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
        }
    };


    return {
        initModule: initModule,
        people: people
    }
})();
