const multer = require("multer");
 const formatOptions={
    image:['image/png','image/jpeg','image/gif'],
    video: ['video/mp4', 'video/mkv', 'video/avi'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    pdf:['application/pdf']

}
const multerHost=(customValidation=[])=>{

    const storage= multer.diskStorage({})
    function fileFilter (req, file, cb) {
        if(customValidation.includes(file.mimetype)){
            cb(null,true)
        }else{
            cb(new Error('invalid extention format'),false)
        }
    }
    const upload=multer({storage,fileFilter})
    return upload

}
module.exports = {multerHost,
  formatOptions};