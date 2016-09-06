/**
 * Created by XRene on 16/8/28.
 */

spa.chat = (function () {
    var configMap = {
        main_html: String()
            + '<div class="spa-chat">'
                + '<div class="spa-chat-head">'
                    + '<div class="spa-chat-head-toggle">'
                    + '</div>'
                    + '<div class="spa-chat-head-title">'
                    + 'Chat'
                    + '</div>'
                + '</div>'
                + '<div class="spa-chat-closer">x</div>'
                + '<div class="spa-chat-sizer">'
                    + '<div class="spa-chat-list">'
                        + '<div class="spa-chat-list-box"></div>'
                    + '</div>'
                    + '<div class="spa-chat-msg">'
                        + '<div class="spa-chat-msg-log"></div>'
                        + '<div class="spa-chat-msg-in">'
                            + '<form class="spa-chat-msg-form">'
                                + '<input type="text"/>'
                                + '<input type="submit" style="display:none;"/>'
                                + '<div class="spa-chat-msg-send">'
                                    + 'send'
                                + '</div>'
                            + '</form>'
                        + '</div>'
                    + '</div>'
                + '</div>'
            + '</div>',
            //可以进行配置的选项
            //未列出来的选项则无法进行配置
            //下面列出来了配置的预设值
            settable_map: {
                slider_open_time: true,
                slider_close_time: true,
                slider_opened_em: true,
                slider_closed_em: true,
                slider_opened_title: true,
                slider_closed_title: true,

                chat_model: true,
                people_model: true,
                set_chat_anchor: true
            },
            slider_open_time: 250,
            slider_close_time: 250,
            slider_opened_em: 16,
            slider_closed_em: 2,
            slider_opened_title: 'Tap to close',
            slider_closed_title: 'Tap to open',

            //spa.model模块配置的chat
            chat_model: null,
            //spa.model模块配置的people
            people_model: null,
            set_chat_anchor: null
        },
        stateMap = {
            $append_target: null,
            position_type: 'closed',
            px_per_em: 0,
            slider_hidden_px: 0,
            slider_closed_px: 0,
            slider_opened_px: 0
        },
        jqueryMap = {},
        setJueryMap, setPxSizes, setSliderPosition,
        onClickToggle, configModule, initModule,
        removeSlider, handleResize,
        scrollChat, writeChat, writeAlert, clearChat, onTagToggle,
        onSubmitMsg, onTapList, onSetchatee, onUpdatechat, onListchange,
        onLogin, onLogout;



    //缓存Dom集合
    setJueryMap = function () {
        var $append_target = stateMap.$append_target,
            $slider = $append_target.find('.spa-chat');

        jqueryMap = {
            $slider: $slider,
            $head: $slider.find('.spa-chat-head'),
            $toggle: $slider.find('.spa-chat-head-toggle'),
            $title: $slider.find('.spa-chat-head-title'),
            $sizer: $slider.find('.spa-chat-sizer'),
            $list_box: $slider.find('.spa-chat-list-box'),
            $msg_log: $slider.find('.spa-chat-msg-log'),
            $msg_in: $slider.find('.spa-chat-msg-in'),
            $input: $slider.find('.spa-chat-msg-in input[type=text]'),
            $send: $slider.find('.spa-chat-msg-send'),
            $form: $slider.find('.spa-chat-form'),
            $window: $(window)
        }
    };

    //计算由该模块管理的元素的像素尺寸
    setPxSizes = function () {
        var px_per_em, opened_height_em, window_height_em;

        px_per_em = spa.util_b.getEmSize(jqueryMap.$slider.get(0));    //获取容器的fontSize大小,em单位的基准点
        window_height_em = Math.floor(
            (jqueryMap.$window.height() / px_per_em) + 0.5
        );

        opened_height_em = configMap.slider_opened_em;

        stateMap.px_per_em = px_per_em;
        stateMap.slider_closed_px = configMap.slider_closed_em * px_per_em;
        stateMap.slider_opened_px = configMap.slider_opened_em * px_per_em;

        jqueryMap.$sizer.css({
            height: (opened_height_em - 2) * px_per_em
        });
    };


    setSliderPosition = function (position_type, callback) {
        var
            height_px, animate_time, slider_title, toggle_text;

        //初始化的时候未将people model赋值给configMap
        if(position_type === 'opened' && configMap.people_model.get_user().get_is_anon()) {
            return false;
        }

        //return true if slider already in requested position
        if(stateMap.position_type === position_type) {
            if(position_type === 'opened') {
                jqueryMap.$input.focus();
            }
            return;
        }

        switch (position_type) {
            case 'opened':
                height_px = stateMap.slider_opened_px;
                animate_time = configMap.slider_open_time;
                slider_title = configMap.slider_opened_title;
                toggle_text = '=';
                //当窗口打开时,输入框自动获取焦点
                jqueryMap.$input.focus();
                break;
            case 'hidden':
                height_px = 0;
                animate_time = configMap.slider_open_time;
                slider_title = '';
                toggle_text = '+';
                break;
            case 'closed':
                height_px = stateMap.slider_closed_px;
                animate_time = configMap.slider_close_time;
                slider_title = configMap.slider_closed_title;
                toggle_text = '+';
                break;
            //bail for unknown position type
            default : return false;
        }

        stateMap.position_type = '';
        jqueryMap.$slider.animate(
            {height: height_px},
            animate_time,
            function () {
                jqueryMap.$toggle.prop('title', slider_title);
                jqueryMap.$toggle.text(toggle_text);
                stateMap.position_type = position_type;
                if(callback) {callback(jqueryMap.$slider)};
            }
        );
        return true;
    };


    //DOM方法
    //Begin private DOM methods to manage chat message
    //用于操作消息记录的所有DOM方法区块的方法


    //scrollChat方法,消息记录文字以平滑滚动的方式显现
    scrollChat = function () {
        var $msg_log = jqueryMap.$msg_log;
        $msg_log.animate({
            scrollTop: $msg_log.prop('scrollHeight') - $msg_log.height()    //TODO 了解下scroll
        }, 150);
    };

    //writeChat方法用于添加消息记录.如果发送者是用户自己,则使用不同的样式.请务必在输出HTML的时候进行编码
    writeChat = function (person_name, text, is_user) {
        var msg_class = is_user ? 'spa-chat-msg-log-me' : 'spa-chat-msg-log-msg';
        jqueryMap.$msg_log.append(
            '<div class=""' + msg_class + '">'
            + spa.util_b.encodeHtml(person_name) + ': '
            + spa.util_b.encodeHtml(text) + '</div>'
        );

        scrollChat();
    };

    //writeAlert方法,用于在消息记录中添加系统警告.请务必在输出HTML的时候进行编码
    //和普通聊天信息的样式有区别
    writeAlert = function (alert_text) {
        jqueryMap.$msg_log.append(
            '<div class="spa-chat-msg-log-alert">'
            + spa.util_b.encodeHtml(alert_text)
            + '</div>'
        );
        scrollChat();
    };

    //clearChat方法用于消除消息记录
    clearChat = function () {
        jqueryMap.$msg_log.empty();
    };


    //End private DOM methods to manage chat message
    //用于操作消息记录的所有DOM方法区块的结束


    //Begin Event Handlers

    //更改URI并立即退出,让shell中的hashChange事件处理程序来捕获URI锚的变化,window时刻都在监听hashchange这个事件
    onTapToggle = function (event) {
        var set_chat_anchor = configMap.set_chat_anchor;
        if(stateMap.position_type === 'opened') {
            set_chat_anchor('closed');
        }
        else if(stateMap.position_type === 'closed') {
            set_chat_anchor('opened');
            return false;
        }
    };

    //发送消息事件
    //onSubmitMsg事件处理程序,当用户提交发送消息时,会产生这个事件.使用model.chat_send_msg方法来发送消息
    onSubmitMsg = function (event) {
        var msg_text = jqueryMap.$input.val();
        if(msg_text.trim() === '') {return false;}  //判断如果输入框的内容为空.则返回
        configMap.chat_model.send_msg(msg_text);
        //获取input焦点
        jqueryMap.$input.focus();
        //通过class来控制样式
        jqueryMap.$send.addClass('spa-x-select');
        setTimeout(function () {
            jqueryMap.$send.removeClass('spa-x-select');
        }, 250);

        return false;
    };

    //选择用户事件
    //onTapList事件,当用户点击或者轻击(tap)用户名的时候,会产生这个事件.使用model.chat.set_chatee方法来设置听者
    //其中model.chat.set_chatee方法对chatee进行设置。在其内部发布'spa-setchatee'事件,并在chat模块订阅'spa-setchatee'事件
    onTapList = function (event) {
        //事件代理
        var $tapped = $(event.elem_target), chatee_id;      //TODO event.elem_target对象是什么?
        if(!$tapped.hasClass('spa-chat-list-name')) {return false;}

        chatee_id = $tapped.attr('data-id');
        if(!chatee_id) {return false;}

        configMap.chat_model.set_chatee(chatee_id);
        return false;
    };

    //onSetchatee事件会选择新的听者并取消选择旧的听者.它也会更改聊天滑块的标题,并通知用户听者已经更改了.
    onSetchatee = function (event, arg_map) {
        var
            new_chatee = arg_map.new_chatee,    //新的听众
            old_chatee = arg_map.old_chatee;    //旧的听众

        jqueryMap.$input.focus();               //获取焦点
        //当new_chatee不存在时,即有用户离开时
        if(!new_chatee) {
            if(old_chatee) {
                writeAlert(old_chatee.name + ' has left the chat');
            } else {
                writeAlert('Your friend has left the chat');
            }
            jqueryMap.$title.text('chat');
            return false;
        }

        //控制被选中人名的样式
        jqueryMap.$list_box
            .find('.spa-chat-list-name')
            .removeClass('spa-x-select')
            .end()
            .find('[data-id=' + arg_map.new_chatee.id + ']')
            .addClass('spa-x-select');

        writeAlert('Now chatting with ' + arg_map.new_chatee.name);
        jqueryMap.$title.text('Chat with ' + arg_map.new_chatee.name);
        return true;
    };

    //为Model发布的spa-listchange事件创建onListchnage事件处理程序.
    //该处理程序会获取当前人员集合,并渲染人员列表,如果有听者的话,则确保高亮听者.
    onListchange = function (event) {
        var
            list_html = String(),
            people_db = configMap.people_model.get_db(),
            chatee = configMap.chat_model.get_chatee();

        //遍历当前数据库,生成用户列表
        people_db().each(function (person, idx) {
            var select_class = '';

            if(person.get_is_anon() || person.get_is_user()) {
                return true;
            }

            if(chatee && chatee.id === person.id) {
                select_class = 'spa-x-select';
            }

            list_html += '<div class="spa-chat-list-name'
                    + select_class + '"data-id="' + person.id + '">'
                    + spa.util_b.encodeHtml(person.name) + '</div>';
        });

        if(!list_html) {
            list_html = String()
                + '<div class="spa-chat-list-note">'
                + 'To chat alone is the fate of all great souls...<br><br>'
                + 'No one is online'
                + '</div>';
            clearChat();
        }
        jqueryMap.$list_box.html(list_html);
    };

    //onUpdatechat事件处理程序会更新消息记录的显示.如果发送者是用户自己,则清除输入框并使之重新获取焦点.它也会把听者设置为消息的发送者.
    onUpdatechat = function (event, msg_map) {
        var is_user,
            sender_id = msg_map.sender_id,
            msg_text = msg_map.msg_text,
            chatee = configMap.chat_model.get_chatee() || {},
            sender = configMap.people_model.get_by_cid(sender_id);


        if(!sender) {
            writeAlert(msg_text);
            return false;
        }

        is_user = sender.get_is_user();

        if(!(is_user || sender_id === chatee.id)) {
            configMap.chat_model.set_chatee(sender_id);
        }

        writeChat(sender.name, msg_text, is_user);

        if(is_user) {
            jqueryMap.$input.val('');
            jqueryMap.$input.focus();
        }
    };

    //为Model发布的spa-login事件创建onLogin事件处理程序.该处理程序会打开聊天滑块
    onLogin = function (event, login_user) {
        configMap.set_chat_anchor('opened');
    };

    //为Model发布的spa-logout事件创建onLogout事件处理程序.该处理程序会清除聊天滑块的消息记录,重置聊天滑块的标题,并关闭聊天滑块
    onLogout = function (event, logout_user) {
        configMap.set_chat_anchor('closed');
        jqueryMap.$title.text('Chat');
        clearChat();
    };

    //End Event Handlers


    //对于功能模块的配置信息
    //内部的configMap始终是自身模块定义的configMap
    configModule = function (input_map) {
        spa.util.setConfigMap({
            input_map: input_map,
            settable_map: configMap.settable_map,
            config_map: configMap
        });
        return true;
    };

    //初始化
    initModule = function ($append_target) {
        var $list_box;

        $append_target.append(configMap.main_html);
        stateMap.$append_target = $append_target;
        setJueryMap();
        setPxSizes();

        jqueryMap.$toggle.prop('title', configMap.slider_closed_title);
        //jqueryMap.$head.click(onTagToggle);
        stateMap.position_type = 'closed';

        //Have $list_box subscribe to jQuery global events
        //订阅Model发布的所有事件
        $list_box = jqueryMap.$list_box;
        $.gevent.subscribe($list_box, 'spa-listchange', onListchange);
        $.gevent.subscribe($list_box, 'spa-setchatee', onSetchatee);
        $.gevent.subscribe($list_box, 'spa-updatechat', onUpdatechat);
        $.gevent.subscribe($list_box, 'spa-login', onLogin);
        $.gevent.subscribe($list_box, 'spa-logout', onLogout);


        //绑定所有的用户输入事件.如果在订阅之前绑定,则会产生竞争条件(race condition)
        jqueryMap.$head.bind('utap', onTagToggle);
        jqueryMap.$list_box.bind('utap', onTapList);
        jqueryMap.$send.bind('utap', onSubmitMsg);


        jqueryMap.$form.bind('submit', onSubmitMsg);

        return true;
    };


    //移除slider组件,但是保留所有的指针
    removeSlider = function () {
        if(jqueryMap.$slider) {
            jqueryMap.$slider.remove();
            jqueryMap = {};
        }

        stateMap.$append_target = null;
        stateMap.position_type = 'closed';

        configMap.chat_model = null;
        configMap.people_model = null;
        configMap.set_chat_anchor = null;

        return true;
    };


    //导出public方法, configModule, initModule, setSliderPosition.
    return {
        initModule: initModule,
        configModule: configModule,
        setSliderPosition: setSliderPosition,
        removeSlider: removeSlider,
        handleResize: handleResize
    }

})();
