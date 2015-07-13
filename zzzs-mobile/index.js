///<reference path="../typings/tsd.d.ts" />
$(function() {

    var hostUrl = "http://zizhu.zsxsoft.com";
    var locationSearch = "";
    $('.button-collapse').sideNav();
	$(".btn-floating-action").click(function() {
		var thisFunction = {
			openInNewWindow: function() {
				openInBrowser(hostUrl + "/" + location.hash.replace("#!", "").replace(/^\/|index.html/g, ""));
			}, 
			refresh: function() {
				location.reload();
			}
		}
		var readyFunction = $(this).data("function");
		thisFunction[readyFunction].call(this);
	});
    /**
     * 强制触发currentView更新
     * @param  {Vue}      vueObject
     * @param  {string}   url
     * @see https://github.com/yyx990803/vue/issues/945
     */
    function updateVue(vueObject, currentView) {
    	showLoading();
        vueObject.currentView = 'waiting'; // 销毁当前的 view
        Vue.nextTick(function() {
            vueObject.currentView = currentView
        }.bind(vueObject))
    }
    
    function openInBrowser(originalUri) {
    	var Intent = plus.android.importClass("android.content.Intent");
    	var main = plus.android.runtimeMainActivity();
    	var Uri = plus.android.importClass("android.net.Uri");
    	var uri = Uri.parse(originalUri);
    	var intent = new Intent(Intent.ACTION_VIEW,uri);
		main.startActivity(intent);
    }
    function showLoading() {
    	$(".when-loading-hide").hide();
    	$(".loading-wrapper-wrapper").show().removeClass("exitLoading-animate").addClass("loading-animate");
    }
    
     function hideLoading() {
    	$(".loading-wrapper-wrapper").removeClass("loading-animate").addClass("exitLoading-animate");
    	setTimeout(function() {
    		$(".loading-wrapper-wrapper").hide();
    		$("when-loading-hide").show();
    	}, 1100);
    }

    /** 
     * 上一页ID记录
     */
    var lastPageId = 0;
    /**
     * 上一页ID临时记录
     */
    var lastPageTempId = 0;
    /**
     * 记录上一页ID
     * 每次翻页前，要先记录本次翻页的ID；在下次翻页之后暂不记录，先把值赋给computed.lastId后才可重新记录
     * 但Vue处理的流程是翻页->compute->拿数据
     * 因此，需要一个函数在拿数据之后，计算之前，临时存储ID。
     */
    function updateLastId(id, method) {
        if (method === 0) { // 拿数据时，更新上一页ID
            //console.log("Update! origId = " + lastPageId + ", lastPageId = " + lastPageTempId + ", tempId = " + id);
            lastPageId = lastPageTempId; // 更新ID到正式变量，并返回原Id
            lastPageTempId = id; // 存储ID到临时变量内

        } else { // 计算时，拿回ID。
            //console.log("lastPageId = " + lastPageId + ", tempId = " + lastPageTempId);
            return lastPageId;
        }
    }
    // 
    // 先把URL Parse一遍
    // 好像并没有什么卵用，全部交给服务端来处理了
    /**
     * HTTP Get QueryString对象
     * @type {Object}
     */
    var $get = {};
    location.search.substr(1).split("&").forEach(function(item) {
        var k = item.split("=")[0],
            v = item.split("=")[1];
        v = v && decodeURIComponent(v);
        (k in $get) ? $get[k].push(v) : $get[k] = [v]
    });

    window.addEventListener('DOMContentLoaded', function() {

        Vue.component('waiting', {
            template: '#waiting-template',
            created: function() {
            }
        });
        
        
        Vue.component('list', {
            template: '#list-template',
            created: function() {
                var that = this; // 这玩意在TypeScript格式化后会改变作用域，所以不能用了=_=
                $.getJSON(hostUrl + "/api/list/" + locationSearch, function(res) {
                    that.list = res;
                    that.isInitialized = true;
					hideLoading();
                    // 上一页ID应该在这里处理，防止数据覆盖
                    updateLastId(that.list[0].id, 0);
                });
            }
        });
        
        
        Vue.component('view', {
            template: '#view-template',
            created: function() {
                var that = this;
                // Page得到的ID不能在这里即时出现，应该是双向绑定的锅
                $.getJSON(hostUrl + "/api/article/" + location.hash.split("/").pop(), function(res) {
                    that.list = [res];
                    that.isInitialized = true;
                    hideLoading();
                    // 处理上一页的ID
                });
            }
        });
        
        Vue.component('advanced', {
            template: '#advanced-template',
            created: function() {
            	hideLoading();
            },
            methods: {
                updateRobot: function(e) {
                    var that = this;
                    $.getJSON(hostUrl + "/api/robot/", function(res) {
                        that.list = JSON.stringify(res);
                        that.isInitialized = true;
                    });
                    e.preventDefault();
                },
                read10Stdout: function(e) {
                    var that = this;
                    $.getJSON(hostUrl + "/api/stdout/10/", function(res) {
                        that.list = res.join("\n");
                        that.isInitialized = true;
                    });
                    e.preventDefault();
                },
                readStdout: function(e) {
                    var that = this;
                    $.getJSON(hostUrl + "/api/stdout/", function(res) {
                        that.list = res.join("\n");
                        that.isInitialized = true;
                    });
                    e.preventDefault();
                }
            }
        });
        
        Vue.component('single-list', {
            template: "#single-list",
            replace: true,
            methods: {
                onClick: function(url, e) {
                	if (/^http/.test(url)) {
                		openInBrowser(url);
                	} else {
                		page(url);
                	}
                    e.preventDefault();
                }
            }
        });
        Vue.component('single-view', {
            template: "#single-view",
            replace: true,
            methods: {
                onClick: function(url, e) {
                	openInBrowser(url);
                    //e.preventDefault();
                }
            }
        });
        /** 
         * 用于记录上一页的ID
         */

        var app = new Vue({
            el: "#app",
            data: {
                isInitialized: false,
                currentView: '',
                result: {
                    list: []
                }
            },
            computed: { // Computed不能在component里定义
                nextId: function() {
                    return this.result.list[this.result.list.length - 1].id;
                },
                lastId: function() {
                    return updateLastId(0, 1);
                }
            }
        });

        page.base((function() {
            var href = location.href;
            href = href.split("/");
            href.splice(0, 3);
            href.pop();
            return "/" + href.join("/") + "/";
        })());
        page("*", function(req, next) {
            console.log(req.path);
            locationSearch  = location.hash.split("?");
            if (locationSearch.length === 0) {
            	locationSearch = "";
            } else {
            	locationSearch = "?" + locationSearch[1];
            }
            next()
        })

        page('index.html', function() {
            app.result.list = [];
            updateVue(app, 'list');
        });

        page('/article/:id', function(object) {
            app.result.list = [];
            updateVue(app, 'view');
        });

        page('/advanced', function(object) {
            app.result.list = "";
            updateVue(app, 'advanced');
        });

        page({
            hashbang: true
        });
    });
});