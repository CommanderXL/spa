spa.shell = (function () {
   var configMap = {
       main_html: String()
        + '<div class="spa-shell-head">'
            + '<div class="spa-shell-head-logo"></div>'
            + '<div class="spa-shell-head-acct"></div>'
            + '<div class="spa-shell-head-search"></div>'
        + '</div>'
        + '<div class="spa-shell-main">'
            + '<div class="spa-shell-main-nav"></div>'
            + '<div class="spa-shell-main-content"></div>'
        + '</div>'
        + '<div class="spa-shell-foot"></div>'
        + '<div class="spa-shell-chat"></div>'
        + '<div class="spa-shell-modal"></div>',
           chat_extend_time: 1000,
           chat_retract_time: 300,
           chat_extend_height: 450,
           chat_retract_height: 15,
           chat_extend_title: 'Click to retract',
           chat_retracted_title: 'Click to extend',
           anchor_schema_map: {
               chat: {
                   open: true,
                   closed: true
               }
           }
       },
       stateMap = {
           $container: null,
           anchor_map: {},
           is_chat_retracted: true
       },   //整个模块中共享的动态信息放在stateMap变量中
       jqueryMap = {},  //缓存jquery到jqueryMap中

       setJqueryMap, toggleChat, onClickChat, initModule,
       copyAnchorMap, changeAnchorPart, onHashChange;

    //工具函数
    copyAnchorMap = function () {
        return $.extend(true, {}, stateMap.anchor_map);  //深度拷贝
    };



    //缓存jquery集合.jqueryMap缓存的用途是大大减少jquery对文档的遍历次数.提高性能.
    setJqueryMap = function () {
        var $container = stateMap.$container;
        jqueryMap = {
            $container: $container,
            $chat: $container.find('.spa-shell-chat')
        };
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


    //锚点变化的监听函数
    onHashChange = function(event) {
        var anchor_map_previous = copyAnchorMap(),
            anchor_map_proposed,
            _s_chat_previous,
            _s_chat_proposed,
            s_chat_proposed;


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
                case 'open':
                    toggleChat(true);
                    break;
                case 'closed':
                    toggleChat(false);
                    break;
                default :
                    toggleChat(false);
                    delete anchor_map_proposed.chat;
                    $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
            }
        }
        //end adjust chat component if changed

        return false;
    };



    //打开或关闭chat
    toggleChat = function (do_extend, callback) {
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

    };

    onClickChat = function (event) {
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
    };

    //public methods
    initModule = function ($container) {
        stateMap.$container = $container;
        $container.html(configMap.main_html);

        setJqueryMap();

        stateMap.is_chat_retracted = true;
        jqueryMap.$chat
            .attr('title', configMap.chat_retracted_title)
            .click(onClickChat);

        //configure uriAnthor to use our schema   配置uriAnchor插件,用以检测模式(schema)
        $.uriAnchor.configModule({
            schema_map: configMap.anchor_schema_map
        });

        $(window)
            .bind('hashChange', onHashChange)
            .trigger('hashChange');
    };



    return {initModule: initModule};
})();