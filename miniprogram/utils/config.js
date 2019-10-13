/**
 * 打赏二维码
 */
var moneyUrl ="https://i.loli.net/2019/10/13/voXP69YSzktZuBc.png"

/**
 * 公众号二维码
 */
var wechatUrl ="https://i.loli.net/2019/10/13/RXdsDoFm9hegKwB.jpg"
/**
 * 云开发环境
 */
var env ="xlbd"
/**
 * 个人文章操作枚举
 */
var postRelatedType = {
    COLLECTION: 1,
    ZAN: 2,
    properties: {
        1: {
            desc: "收藏"
        },
        2: {
            desc: "点赞"
        }
    }
};

module.exports = {
    postRelatedType: postRelatedType,
    moneyUrl:moneyUrl,
    wechatUrl:wechatUrl,
    env:env
}