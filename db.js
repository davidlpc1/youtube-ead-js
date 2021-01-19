const urlForDatabase = './ead.db'
const fs = require('fs')
const databaseAlreadyExists = fs.existsSync(urlForDatabase)

const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database(urlForDatabase)

const bcrypt = require('bcrypt')

if (!databaseAlreadyExists) { 
    const tables = require('./tables.json')
    db.serialize(() => {
        tables.forEach(createTableCommand =>  db.run(createTableCommand))
    })
}

db.findUserByName = (username) => {
    return new Promise((resolve,reject) => {
        db.all(`SELECT * FROM USERS WHERE username = ?`,[username],(error,rows) => {
            if(error) {
                reject(error)
                throw new Error(error)
            }
    
            resolve(rows)
        })
    })
}

db.findById = (id) => {
    return new Promise((resolve,reject) => {
        db.all(`SELECT * FROM USERS WHERE id = ?`,[id],(error,rows) => {
            if(error) {
                reject(error)
                throw new Error(error)
            }

            resolve(rows)
        })
    })
}

db.addUser = (username,password,image,about) => {
    return new Promise(async(resolve, reject) => {
        const saltRounds = 10
        const usersWithThatName = await db.findUserByName(username)
        if(usersWithThatName.length > 0){
            reject({ message:'That username already exists' })
        }
        bcrypt.genSalt(saltRounds, (err, salt) => {
            if(err) reject('Error in criptografe your password')
            bcrypt.hash(password, salt, (err, hash) => {
                if(err) reject('Error in criptografe your password')
                db.run("INSERT INTO users (username,hash,level,image,about) VALUES(?,?,1,?,?) ",
                [username,hash,image,about],(error) => {
                    if(error) reject(error)
                })
                resolve('Sucess')
            })
        })
    })
}

db.findAllUsers = () => {
    return new Promise((resolve,reject) => {
        db.all(`SELECT * FROM USERS`,(error,rows) => {
            if(error) {
                reject(error)
                throw new Error(error)
            }
    
            resolve(rows)
        })
    })
}

db.deleteAllUsers = () => {
    return new Promise((resolve,reject) => {
        db.run(`DELETE FROM users`,error=>{
            if(error) {
                reject(error)
                throw new Error(error)
            }
    
            resolve('All users have been deleted')
        })
    })
}

db.loginUser = (username,password) => {
    return new Promise(async (resolve,reject) => {
        const user = await db.findUserByName(username)
        if(user.length <= 0){
            reject({ message:'User not found' })
            throw new Error('User not found')
        }
        const { id,hash } = user[0]
        const passwordIsCorrect = await db.testPassword
        if(!passwordIsCorrect) {
            reject('Your password is incorrect')
            throw new Error('Your password is incorrect')
        }
        
        bcrypt.compare(password, hash, (err, result) => {
            if(err) {
                reject(err)
                throw new Error(err.message)
            }
            if(result) resolve(id)
        })
    })
}

db.updateUser = (id,username,image,about) => {
    return new Promise(async(resolve, reject) => {
        db.run(`UPDATE users  
            SET username= ? ,image= ? , about= ? 
            WHERE id = ?;
        `,[username,image,about,id],(error) => {
            if(error) reject(error)
        })
    })
}

db.testPassword = (id,password) => {
    return new Promise(async(resolve,reject) => {
        const { hash } = (await db.findById(id))[0]
        resolve(bcrypt.compareSync(password, hash))
    })
}

db.changePassword = (id,old_password,new_password) => {
    return new Promise(async(resolve,reject) => {
        const { hash } = (await db.findById(id))[0]
        if(!bcrypt.compareSync(old_password, hash)) {
            reject('Your password is incorrect')
            throw new Error('Your password is incorrect')
        }

        const saltRounds = 10
        const salt = bcrypt.genSaltSync(saltRounds)
        const newHash = bcrypt.hashSync(new_password, salt)

        db.run(`UPDATE users  
            SET hash= ? 
            WHERE id = ?;
        `,[newHash,id],(error) => {
            if(error) {
                reject(error)
                throw new Error(error)
            }

            resolve('Sucess')
        })
    })
}

db.findCategoryByName = (name) => {
    return new Promise(async(resolve,reject) => {
        db.all(`SELECT * FROM categories WHERE name = ?`,[name],(error,rows) => {
            if(error) reject(error)
            
            resolve(rows)
        })
    })
}

db.findCategoriesByUserId = (userID) => {
    return new Promise(async(resolve,reject) => {
        db.all(`SELECT * FROM categories WHERE user_id = ?`,[userID],(error,rows) => {
            if(error) reject(error)
            
            resolve(rows)
        })
    })
}

db.findAllCategories = () => {
    return new Promise((resolve,reject) => {
        db.all(`SELECT * FROM categories`,(error,rows) => {
            if(error) reject(error)
            
            resolve(rows)
        })
    })
}

db.createCategory = (userID,name) => {
    return new Promise((resolve,reject) => {
        db.run("INSERT INTO categories (user_id,name) VALUES(?,?) ",
        [userID,name],(error) => {
            if(error) {
                reject(error)
                throw new Error(error)
            }

            resolve('Sucess')
        })      
    })
}

db.findVideoByName = (name) => {
    return new Promise((resolve,reject) => {
        db.all(`SELECT * FROM videos WHERE name = ?`,[name],(error,rows) => {
            if(error) {
                reject(error)
                throw new Error(error.message)
            }
            
            resolve(rows)
        })
    })
}

db.createVideo = (name,link,category,user_id,video_src,image_src) => {
    return new Promise((resolve,reject) => {
        db.run("INSERT INTO videos (name,link,category,user_id,video_src,image_src) VALUES(?,?,?,?,?,?)",
        [name,link,category,user_id,video_src,image_src],(error) => {
            if(error) {
                reject(error)
                throw new Error(error)
            }

            resolve('Sucess')
        }) 
    })
}

const debuging = false
if(debuging){
    db.deleteAllUsers().then(() => {})
}

// db.insertData = (data) => {
//     return new Promise((resolve,reject) => {
//         const query = `
//         INSERT INTO notes(
//             name,
//             description
//         )
//         VALUES (?,?)
//         `

//         db.run(query,data,error => {
//             if (error) return reject(error)
    
//             resolve(`I have inserted ${this}`)
//         })
//     })
// }

// db.updateData = (data) => {
//     return new Promise((resolve,reject) => {
//         db.run(`UPDATE notes SET name = ?, description = ? WHERE id = ?`,[data.name,data.description,data.id],error=>{
//             if(error) return reject(error)

//             resolve(`I have updated the note with id ${data.id}`)
//         })
//     })
// }

module.exports = db