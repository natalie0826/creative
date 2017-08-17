$(document).ready(function () {
    var appMenu = new Vue({
        el: '#appMenu',
        data: {
            show: true,
            userInfo: {
                id: 0
            }
        },
        mounted: function () {
            this.userInfo = this.getUserInfo();
        },
        methods: {
            getUserInfo: function () {
                var userName = JSON.parse(sessionStorage.getItem('userInfo'));
                if (userName != undefined) {
                    return userName;
                } else {
                    return {
                        id: 0
                    };
                }
            },
            logout: function () {
                sessionStorage.removeItem('userInfo');
                window.location.href="index.html";
            }
        }
    });

    //to top
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('#go-to-top').fadeIn();
        } else {
            $('#go-to-top').fadeOut();
        }
    });

    $('#go-to-top').click(function () {
        $('body,html').animate({
            scrollTop: 0
        }, 1500);
        return false;
    });

});
