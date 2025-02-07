// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: process.env.Env })
const Towxml = require('towxml');
const db = cloud.database()
const _ = db.command
const dateUtils = require('date-utils')

const towxml = new Towxml();

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.action) {
    case 'getPostsDetail': {
      return getPostsDetail(event)
    }
    case 'addPostComment': {
      return addPostComment(event)
    }
    case 'addPostChildComment': {
      return addPostChildComment(event)
    }
    case 'addPostCollection': {
      return addPostCollection(event)
    }
    case 'deletePostCollectionOrZan': {
      return deletePostCollectionOrZan(event)
    }
    case 'addPostZan': {
      return addPostZan(event)
    }
    case 'addPostQrCode': {
      return addPostQrCode(event)
    }
    default: break
  }
}

/**
 * 新增文章二维码
 * @param {} event 
 */
async function addPostQrCode(event) {
  //let scene = 'timestamp=' + event.timestamp;
  let result = await cloud.openapi.wxacode.getUnlimited({
    scene: event.postId,
    page: 'pages/detail/detail'
  })

  if (result.errCode === 0) {
    let upload = await cloud.uploadFile({
      cloudPath: event.postId + '.png',
      fileContent: result.buffer,
    })

    await db.collection("mini_posts").doc(event.postId).update({
      data: {
        qrCode: upload.fileID
      }
    });

    let fileList = [upload.fileID]
    let resultUrl = await cloud.getTempFileURL({
      fileList,
    })
    return resultUrl.fileList
  }

  return []

}
/**
 * 新增评论
 * @param {} event 
 */
async function addPostComment(event) {

  console.info("处理addPostComment")
  let task = db.collection('mini_posts').doc(event.commentContent.postId).update({
    data: {
      totalComments: _.inc(1)
    }
  });
  await db.collection("mini_comments").add({
    data: event.commentContent
  });
  let result = await task;
  console.info(result)
}

/**
 * 新增子评论
 * @param {} event 
 */
async function addPostChildComment(event) {

  let task = db.collection('mini_posts').doc(event.postId).update({
    data: {
      totalComments: _.inc(1)
    }
  });

  await db.collection('mini_comments').doc(event.id).update({
    data: {
      childComment: _.push(event.comments)
    }
  })
  await task;
}

/**
 * 处理文章收藏
 * @param {*} event 
 */
async function addPostCollection(event) {
  console.info("处理addPostCollection方法开始")
  console.info(event)
  let postRelated = await db.collection('mini_posts_related').where({
    openId: event.openId == undefined ? event.userInfo.openId : event.openId,
    postId: event.postId,
    type: event.type
  }).get();

  let task = db.collection('mini_posts').doc(event.postId).update({
    data: {
      totalCollection: _.inc(1)
    }
  });

  if (postRelated.data.length === 0) {
    let date = new Date().toFormat("YYYY-MM-DD")
    let result = await db.collection('mini_posts_related').add({
      data: {
        openId: event.openId == undefined ? event.userInfo.openId : event.openId,
        postId: event.postId,
        postTitle: event.postTitle,
        postUrl: event.postUrl,
        postDigest: event.postDigest,
        type: event.type,
        createTime: new Date().toFormat("YYYY-MM-DD")
      }
    })
    console.info(result)
  }

  let result = await task;
  console.info(result)
}

/**
 * 处理赞
 * @param {} event 
 */
async function addPostZan(event) {

  let postRelated = await db.collection('mini_posts_related').where({
    openId: event.openId == undefined ? event.userInfo.openId : event.openId,
    postId: event.postId,
    type: event.type
  }).get();

  let task = db.collection('mini_posts').doc(event.postId).update({
    data: {
      totalZans: _.inc(1)
    }
  });

  if (postRelated.data.length === 0) {
    await db.collection('mini_posts_related').add({
      data: {
        openId: event.openId == undefined ? event.userInfo.openId : event.openId,
        postId: event.postId,
        postTitle: event.postTitle,
        postUrl: event.postUrl,
        postDigest: event.postDigest,
        type: event.type,
        createTime: new Date().toFormat("YYYY-MM-DD")
      }
    });
  }
  let result = await task;
  console.info(result)
}

/**
 * 移除收藏/赞
 * @param {} event 
 */
async function deletePostCollectionOrZan(event) {
  //TODO:文章喜欢总数就不归还了？
  let result = await db.collection('mini_posts_related').where({
    openId: event.openId == undefined ? event.userInfo.openId : event.openId,
    postId: event.postId,
    type: event.type
  }).remove()
  console.info(result)
}
/**
 * 获取文章明细
 * @param {} id 
 */
async function getPostsDetail(event) {
  console.info("启动getPostsDetail")
  console.info(event)
  let post = await db.collection("mini_posts").doc(event.id).get()
  if (post.code) {
    return "";
  }
  if (!post.data) {
    return "";
  }
  let data = post.data

  //获取文章时直接浏览量+1
  let task = db.collection('mini_posts').doc(event.id).update({
    data: {
      totalVisits: _.inc(1)
    }
  })

  let content = await convertPosts(data.content, data.contentType);
  data.content = content;
  data.totalVisits = data.totalVisits + 1;
  await task;
  return data
}

/**
 * 转换下程序文章
 * @param {} isUpdate 
 */
async function convertPosts(content, type) {
  let res
  if (type === 'markdown') {
    while (content.indexOf("\\n") >= 0) { content = content.replace("\\n", " \n "); } //新增 用于修复 \n 不识别问题
    res = await towxml.toJson(content || '', 'markdown');
  } else {
    res = await towxml.toJson(content || '', 'html');
  }
  return res;

}