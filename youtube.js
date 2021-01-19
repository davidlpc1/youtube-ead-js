function getYoutubeId(youtubeURL) {
    const youtubeId = youtubeURL
        .replace(
            /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/,
            '$7',
        );
    return youtubeId
}

function getImageUrl(youtubeURL){
    return `https://img.youtube.com/vi/${getYoutubeId(youtubeURL)}/hqdefault.jpg`
}

function getVideoSrc(youtubeURL){
    return `https://www.youtube.com/embed/${getYoutubeId(youtubeURL)}`
}

module.exports = {
    getImageUrl,
    getVideoSrc,
}