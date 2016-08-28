/**
 * Created by XRene on 16/8/28.
 */

spa.fake = (function () {
    var getPeopleList;

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
    }

    return {
        getPeopleList: getPeopleList
    }
})();
