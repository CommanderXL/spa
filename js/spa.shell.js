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
           chat_retracted_title: 'Click to extend'
       },
       stateMap = {
           $container: null,
           is_chat_retracted: true
       },   //整个模块中共享的动态信息放在stateMap变量中
       jqueryMap = {},  //缓存jquery到jqueryMap中

       setJqueryMap, toggleChat, onClickChat, initModule;


    //缓存jquery集合.jqueryMap缓存的用途是大大减少jquery对文档的遍历次数.提高性能.
    setJqueryMap = function () {
        var $container = stateMap.$container;
        jqueryMap = {
            $container: $container,
            $chat: $container.find('.spa-shell-chat')
        };
    };

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
        toggleChat(stateMap.is_chat_retracted);
        return;
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
    };



    return {initModule: initModule};
})();