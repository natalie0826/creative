$["postJson"] = function (url, data, callback) {
    // shift arguments if data argument was omitted
    if (jQuery.isFunction(data)) {
        callback = data;
        data = undefined;
    }

    return jQuery.ajax({
        url: url,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(data),
        success: callback
    });
};

var parentCommentId = "";
var parentCommentLogin = "";

function getParameterByName(name, url) {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function buildHierarchy(arry) {

    var roots = [],
        children = {};

    // find the top level nodes and hash the children based on parent
    for (var i = 0, len = arry.length; i < len; ++i) {
        var item = arry[i],
            p = item.Parent,
            target = !p ? roots : (children[p] || (children[p] = []));

        target.push({
            value: item
        });
    }

    // function to recursively build the tree
    var findChildren = function (parent) {
        if (children[parent.value.id]) {
            parent.children = children[parent.value.id];
            for (var i = 0, len = parent.children.length; i < len; ++i) {
                findChildren(parent.children[i]);
            }
        }
    };

    // enumerate through to handle the case where there are multiple roots
    for (var i = 0, len = roots.length; i < len; ++i) {
        findChildren(roots[i]);
    }

    return roots;
}

//one post
$(document).ready(function () {
    var findPostId = getParameterByName('postId');

    var month = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    //write "" so that when the page is loading, there is no {{title}}
    var app = new Vue({
        el: '#app',
        data: {
            show: true,
            title: "",
            subscribe: "",
            subtitle: "",
            text: "",
            photo: "",
            authorId: "",
            tags: ""
            //tags: []
        },
        methods: {
            newPath: function () {
                window.location.href = "post.html?postId=" + findPostId;
            },
            identityPost: function () {
                var findUserId = JSON.parse(sessionStorage.getItem('userInfo'));
                if (findUserId == null) {
                    return false;
                } else {
                    //check if current post belong authorized user or not. if yes, slow edit/delete buttons
                    return this.authorId == findUserId.id;
                }
            },
            editOrCreate: function () {
                if (getParameterByName('postId') != null) {
                    return true;
                } else {
                    return false;
                }
            },
            redirect: function () {
                window.history.back();
            }
        }
    });

    jQuery.get(
        //get the post and its author
        "http://localhost:3000/posts/" + findPostId + "?_expand=user", {},
        //this function will be called only after the result returns from http://localhost:3000/posts
        function (findPost) {

            var formattedDate = new Date(parseInt(findPost.datePostUpdate));
            formattedDate = formattedDate.getDate() + "th " + month[formattedDate.getMonth()] + " " + formattedDate.getFullYear();

            app.title = findPost.title;
            app.subtitle = findPost.subtitle;
            app.text = findPost.text;
            app.subscribe = formattedDate + " by " + findPost.user.login;
            app.photo = findPost.photoPost;
            app.authorId = findPost.user.id;
        }
    );

    jQuery.get(
        "http://localhost:3000/postsTags?postId=" + findPostId, {},
        function (foundedTags) {
            if (foundedTags.length > 0) {
                var newStringTags = "";
                var tagsArray = [];

                foundedTags.forEach(function (item) {
                    tagsArray.push(item.nameTag);
                    //newStringTags += item.nameTag + ", ";
                });
                //newStringTags = newStringTags.substring(0, newStringTags.length - 2);
                app.tags=tagsArray;
                console.log("TA", tagsArray);
                //app.tags = newStringTags;
                //console.log("NST", newStringTags);
                
                var t, $tag_box;
                $("#tag").tagging("add", app.tags);
               
            }
        }
    );
    //console.log("NT", app.tags);

    var monthNumber = [01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12];

    //show comments to the post
    jQuery.get(
        "http://localhost:3000/comments/?postId=" + findPostId + "&_expand=user", {},
        function (comments) {
            if (comments.length > 0) {
                for (var i = 0; i < comments.length; i++) {
                    //create a new field for the username
                    comments[i].loginUser = comments[i].user.login;
                    var formattedDate = new Date(parseInt(comments[i].dateCommentCreate));
                    comments[i].dateCommentCreate = formattedDate.getDate() + "." + monthNumber[formattedDate.getMonth()] + "." + formattedDate.getFullYear() + ", " + formattedDate.getHours() + ":" + formattedDate.getMinutes() + ":" + formattedDate.getSeconds();
                    comments[i].dateCommentCreate = moment(comments[i].dateCommentCreate, "DD.MM.YYYY, h:mm:ss").fromNow();

                    comments[i].userAuthor = "";
                    (function (oneComment) {
                        $.getJSON("http://localhost:3000/comments/" + oneComment.Parent, function (findComment) {
                            if (findComment.length > 1) {
                                oneComment.userAuthor = "";
                            } else {
                                $.getJSON("http://localhost:3000/users/" + findComment.userId, function (findUser) {
                                    oneComment.userAuthor = "to " + findUser.login;
                                    console.log(oneComment.userAuthor);
                                });
                            }
                        });
                    })(comments[i]);
                }

                //form the object to transfer to the vue tree
                var data = {
                    value: {
                        id: 0
                    },
                    children: buildHierarchy(comments)
                };

                //building a tree with vue.js
                Vue.component('item', {
                    template: '#item-template',
                    props: {
                        model: Object
                    },
                    data: function () {
                        return {
                            open: true
                        }
                    },
                    //change every time when any variable that enters here is changed
                    computed: {
                        isFolder: function () {
                            return this.model.children &&
                                this.model.children.length
                        }
                    },
                    methods: {
                        toggle: function () {
                            if (this.isFolder) {
                                this.open = !this.open
                            }
                        },
                        addChild: function () {
                            //save comment id in parentCommentId
                            parentCommentId = this.model.value.id;
                            this.userAnswered();
                            $(this).addClass('active');
                            $('body,html').animate({
                                scrollTop: $('#appIsLogged').position().top + 70
                            }, 400);

                        },
                        //function only replace the main text of the comment with the text "This comment has been removed."
                        deleteComment: function () {
                            //save comment id in the variable commentId
                            var commentId = this.model.value.id;
                            $.ajax({
                                url: "http://localhost:3000/comments/" + commentId,
                                type: 'PATCH',
                                success: function (result) {
                                    window.location.reload();
                                },
                                data: {
                                    "text": "This comment has been removed."
                                }
                            });
                        },
                        userAnswered: function () {
                            //save the comment's author login in the variable parentCommentLogin 
                            return parentCommentLogin = this.model.value.loginUser;
                        }
                    }
                })

                // boot up the demo
                var demo = new Vue({
                    el: '#commentTree',
                    data: {
                        show: true,
                        userInfo: {
                            id: 0
                        },
                        treeData: data
                    },
                    mounted: function () {
                        this.userInfo = this.getUserInfo();
                    },
                    methods: {
                        getUserInfo: function () {
                            var userName = JSON.parse(sessionStorage.getItem('userInfo'));
                            if (userName != null) {
                                return userName;
                            } else {
                                return {
                                    id: 0
                                };
                            }
                        }
                    }
                });


            }
        });
});

//check whether the user is authorized and if so show form "create comment"
var appIsLogged = new Vue({
    el: '#appIsLogged',
    data: {
        show: true
    },
    methods: {
        isUserLogged: function () {
            if (JSON.parse(sessionStorage.getItem('userInfo')) != null) {
                return true;
            } else {
                return false;
            }
        }
    }
});

//delete post and all the dependencies to it
function deletePost() {
    var findPostId = getParameterByName('postId');
    $.ajax({
        url: "http://localhost:3000/posts/" + findPostId,
        type: "DELETE",
        success: function (result) {
            window.location.href = "index.html";
        }
    });
}

function createNewComment() {
    var text = $('#textComment').val();
    var userCurrentId = JSON.parse(sessionStorage.getItem('userInfo'));
    userCurrentId = userCurrentId.id;

    var findPostId = +getParameterByName('postId');

    var dateComment = new Date();
    dateComment = dateComment.valueOf();

    if (text == "") {
        alert("Fill in textarea!");
    } else {
        $.postJson(
            "http://localhost:3000/comments", {
                "userId": userCurrentId,
                "postId": findPostId,
                "Parent": parentCommentId,
                "text": text,
                "dateCommentCreate": dateComment
            },
            function (commentNew) {
                window.location.reload();
            }
        );
    }
}
