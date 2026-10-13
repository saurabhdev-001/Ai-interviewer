import React from 'react'
import {userEffect} from 'react'
import {userSelector} from 'react-redux'
import {FaTimes} from "react-icons/fa";

function AuthModel({onClose}){
    const{userData}=userSelector((state)=>state.user)

    userEffect(()=>{
        if(userData){
            onClose()
        }
    },[userData,onClose])

    return(
        <div classname='fixed inset-0 z-[999] flex items-center justify-center 
        bg-black/10 backdrop-blur-sm px-4'>
            <div classname='realtive w-full max-w-md'>
                <button classname='absolute top-8 right-5 text-gray-800
                hover:text-black text-xl'>
                    <FaTimes size={18}/>
                </button>
                <Auth isModel={true}/>
            </div>

        </div>
    )
}

export default AuthModel