spa.shell = (function () {
   var configMap = {
       main_html: String()
        + '<div class="spa-shell-head">'
            + '<div class="spa-shell-head-logo">'
                + '<h1>SPA</h1>'
                + '<p>javascript end to end</p>'
            +'</div>'
            + '<div class="spa-shell-head-acct"></div>'
            /*+ '<div class="spa-shell-head-search"></div>'*/
        + '</div>'
        + '<div class="spa-shell-main">'
            + '<div class="spa-shell-main-nav"></div>'
            + '<div class="spa-shell-main-content"></div>'
        + '</div>'
        + '<div class="spa-shell-foot"></div>'
        + '<div class="spa-shell-modal"></div>',
          /* chat_extend_time: 1000,
           chat_retract_time: 300,
           chat_extend_height: 450,
           chat_retract_height: 15,
           chat_extend_title: 'Click to retract',
           chat_retracted_title: 'Click to extend',*/
           //锚点schema映射,包含了不同模块的映射
           anchor_schema_map: {
               chat: {
                   opened: true,
                   closed: true
               }
           }
       },
       stateMap = {
           anchor_map: {}
       },   //整个模块中共享的动态信息放在stateMap变量中
       jqueryMap = {},  //缓存jquery到jqueryMap中

       setJqueryMap, /*toggleChat, */onClickChat, initModule,
       copyAnchorMap, changeAnchorPart, onHashChange, setChatAnchor;

    //工具函数
    copyAnchorMap = function () {
        return $.extend(true, {}, stateMap.anchor_map);  //深度拷贝
    };



    //缓存jquery集合.jqueryMap缓存的用途是大大减少jquery对文档的遍历次数.提高性能.
    setJqueryMap = function () {
        var $container = stateMap.$container;
        jqueryMap = {
            $container: $container,
            $acct: $container.find('.spa-shell-head-acct'),
            $nav: $container.find('.spa-shell-main-nav')
            //$chat: $container.find('.spa-shell-chat')
        };
    };


    //点击登录/登出按钮操作
    onTapAcct = function (event) {
        var acct_text, user_name, user = spa.model.people.get_user();
        if(user.get_is_anon()) {
            user_name = prompt('please sign-in');
            spa.model.people.login(user_name);
            jqueryMap.$acct.text('...processing...');
        } else {
            spa.model.people.logout();
        }
        return false;
    };


    //登录后,显示用户的名称
    onLogin = function (event, login_user) {
        jqueryMap.$acct.text(login_user.name);
    };

    //登出,更改文案内容
    onLogout = function (event, login_user) {
        jqueryMap.$acct.text('please sign in');
    };


    changeAnchorPart = function (arg_map) {
        var anchor_map_revise = copyAnchorMap(),
            bool_return = true,
            key_name, key_name_dep;

        for(key_name in arg_map) {
            if(arg_map.hasOwnProperty(key_name)) {
                if(key_name.indexOf('_') === 0) continue;

                //update independent key value
                anchor_map_revise[key_name] = arg_map[key_name];

                //update matching dependent key
                key_name_dep = '_' + key_name;
                if(arg_map[key_name_dep]) {
                    anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
                } else {
                    delete anchor_map_revise[key_name_dep];
                    delete anchor_map_revise['_s' + key_name_dep]
                }
            }
        }
        //End merge changes into anchor map

        //begin attempt to update URI, revert if not successful
        try {
            $.uriAnchor.setAnchor(anchor_map_revise);
        }
        catch (err) {
            //replace URI with existing state
            $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
            bool_return = false;
        }

        return bool_return;
    };


    //解析URI锚点,将需要改变的锚点和当前的锚点进行比较,当需要改变的锚点和现在的锚点不同,且anchor schema同意时方可改变
    //锚点变化的监听函数
    onHashChange = function(event) {
        var anchor_map_previous = copyAnchorMap(),
            anchor_map_proposed,
            _s_chat_previous,
            _s_chat_proposed,
            s_chat_proposed,
            is_ok = true;


        try {
            anchor_map_proposed = $.uriAnchor.makeAnchorMap();
        }
        catch (e) {
            $.uriAnchor.setAnchor(anchor_map_previous, null, true);
            return false;
        }
        stateMap.anchor_map = anchor_map_proposed;


        //convenience vars
        _s_chat_previous = anchor_map_previous._s_chat;
        _s_chat_proposed = anchor_map_proposed._s_chat;


        //begin adjust chat component if changed
        if(!anchor_map_previous || _s_chat_previous !== _s_chat_proposed) {
            s_chat_proposed = anchor_map_proposed.chat;

            switch (s_chat_proposed) {
                case 'opened':
                    //toggleChat(true);
                    is_ok = spa.chat.setSliderPosition('opened');
                    break;
                case 'closed':
                    //toggleChat(false);
                    is_ok = spa.chat.setSliderPosition('closed');
                    break;
                default :
                    spa.chat.setSliderPosition('closed');
                    delete anchor_map_proposed.chat;
                    $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
                    //toggleChat(false);
                    /*delete anchor_map_proposed.chat;
                    $.uriAnchor.setAnchor(anchor_map_proposed, null, true);*/
            }
        }
        //end adjust chat component if changed

        //当setSilderPosition返回false值时(意味着更改位置的请求被拒绝),作出恰当的反应,
        //要么回退到之前的位置的锚值,或者如果之前的不存在,则使用默认的.
        if(!is_ok) {
            if(anchor_map_previous) {
                $.uriAnchor.setAnchor(anchor_map_previous, null, true);
                stateMap.anchor_map = anchor_map_previous;
            } else {
                delete anchor_map_proposed.chat;
                $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
            }
        }
        return false;
    };


    setChatAnchor = function (position_type) {
        return changeAnchorPart({chat: position_type});
    };


    //打开或关闭chat
    /*toggleChat = function (do_extend, callback) {
        var px_chat_ht = jqueryMap.$chat.height(),
            is_open = px_chat_ht === configMap.chat_extend_height,  //是否展开了
            is_closed = px_chat_ht === configMap.chat_retract_height,   //是否收拢了
            is_siding = !is_open && !is_closed;                     //判断当前状态

        if(is_siding) return false;


        if(do_extend) {
            jqueryMap.$chat.animate(
                {height: configMap.chat_extend_height},
                configMap.chat_extend_time,
                function () {
                    jqueryMap.$chat.attr('title', configMap.chat_extend_title);
                    stateMap.is_chat_retracted = false;
                    if(callback) callback(jqueryMap.$chat);
                }
            );
            return true;
        }

        jqueryMap.$chat.animate(
            {height: configMap.chat_retract_height},
            configMap.chat_retract_time,
            function () {
                jqueryMap.$chat.attr('title', configMap.chat_retracted_title);
                stateMap.is_chat_retracted = true;
                if(callback) callback(jqueryMap.$chat);
            }
        );

        return true;

    };*/

    /*onClickChat = function (event) {
        if(toggleChat(stateMap.is_chat_retracted)) {
            $.uriAnchor.setAnchor({
                chat: (stateMap.is_chat_retracted ? 'open' : 'closed')
            });
        }
        changeAnchorPart(
            {
                chat: (stateMap.is_chat_retracted ? 'open' : 'closed')
            }
        );
        return false;
    };*/

    //public methods
    initModule = function ($container) {
        stateMap.$container = $container;
        $container.html(configMap.main_html);

        setJqueryMap();

        //让$container订阅 'spa-login' 和 'spa-logout' 事件
        $.gevent.subscribe($container, 'spa-login', onLogin);
        $.gevent.subscribe($container, 'spa-logout', onLogout);

        //初始化用户区的文字.在用户区上,绑定触摸或者鼠标点击的事件处理程序
        jqueryMap.$acct
            .text('Please sign-in')
            .bind('utap', onTapAcct);

        /*stateMap.is_chat_retracted = true;
        jqueryMap.$chat
            .attr('title', configMap.chat_retracted_title)
            .click(onClickChat);*/

        //configure uriAnthor to use our schema   配置uriAnchor插件,用以检测模式(schema???)这个地方的模式是什么意思
        $.uriAnchor.configModule({
            schema_map: configMap.anchor_schema_map
        });

        //chat模块的配置
        spa.chat.configModule({
            set_chat_anchor: setChatAnchor,
            chat_model: spa.model.chat,     //初始化chat模块时,将spa.model的chat模块进行配置
            people_model: spa.model.people  //初始化chat的people模块,将spa.model的people模块进行配置
        });
        //chat模块的初始化
        spa.chat.initModule(jqueryMap.$container);

        //初始化过程中完成事件绑定
        $(window)
            .bind('hashchange', onHashChange)
            .trigger('hashchange');
    };



    return {initModule: initModule};
})();