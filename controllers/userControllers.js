const { request } = require("express");
const express = require("express");
const router = express.Router();
const passport = require("passport");
const ParkingLocation=require("../models/Location");
var Userdb=require('../models/Users');
const bcrypt = require("bcryptjs");
const BookedSlots=require('../models/BookedSlots');


// Get form for update user
router.get('/:id/update-user',(req,res)=>{
    const id=req.params.id;
    Userdb.findById(id)
        .then(userdata=>{
            if(!userdata)
            {
                res.status(404).send({message:`not found user ${id}`})
            }
            else{
               // console.log(userdata);
                res.render("update_user",{user:userdata})
            }
        })
        .catch(err=>{
            res.send(err);
        })
})

// Post for update user
router.post('/:id/update-user',(req,res)=>{
    if(!req.body)
    {
        res.status(400).send({message:"Data to update cant be empty!"});
        return;
           
    }
    const newUser=req.body;
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;

            // Set Password to Hash
            newUser.password = hash;
            const id =req.params.id;
    Userdb.findByIdAndUpdate(id,newUser,{useFindAndModify:false})
        .then(data=>{
            if(!data)
            {
                res.status(404).send({message:`cannot update user ${id}`})
            }else{
                res.redirect(`/user/${id}`)
            }
        })
        .catch(err=>{
            res.status(500).send({message:"Error Update user information"})
        })
        });
    });
    
});
   

// Get user index page
router.get("/:id", async(req, res) => {
	const parkings=await ParkingLocation.find({});
	res.render("../views/user_index",{parkings,user_id:req.params.id});
});

// Get request for date and time entry
router.get('/:id/:p_id',async(req,res)=>{
    res.render('../views/date_time_entry',{parking_id:req.params.p_id,user_id:req.params.id});
})

// Post request for date and time entry
router.post('/:id/:p_id',async(req,res)=>{

    console.log(req.body)
    
    var newStartTime=req.body.starttime;
    var startDate= req.body.startdate;
    var startTime= req.body.starttime;
    var start_book= new Date(startDate+"T"+startTime+"Z");
    newStartTime=start_book;
    var duration= req.body.dur;
    
    var newEndTime=new Date(start_book.getTime()+duration*3600000);

    var UndesiredSlots = await BookedSlots.find({"starttime": {"$lt": newEndTime},"endtime": {"$gt": newStartTime}, "location":req.params.p_id,"vehicletype":req.body.vtype})
        
    UndesiredSlots= UndesiredSlots.map((slot)=>{
        return slot.slotnumber;
    });
    var number,price;
    const vtype= req.body.vtype;
    const curslot = await ParkingLocation.findById(req.params.p_id);
    if(vtype.type==="two")
    {
        number=curslot.slot2w;
        price=duration*curslot.price2w;
    }
    else
    {
        number=curslot.slot4w;
        price=duration*curslot.price4w;
    }
    var slotno=-1;
    for(var i = 1; i <= number; i++) {
        if(UndesiredSlots.includes(i)) {
            continue;
        }
        else{
            slotno=i;
            break;
        }
    }
    
    if(slotno==-1)
    {
        res.redirect(`/user/${req.params.id}/${req.params.p_id}`);
    }
    else{
        req.app.set('slotno',slotno);
        req.app.set('price',price);
        const Slots = new BookedSlots({
            location:req.params.p_id,
            slotnumber:slotno,
            starttime:newStartTime,
            endtime:newEndTime,
            vehiclenumber:req.body.vno,
            vehicletype:req.body.vtype,
            price,
            user:req.params.id
        }) ;
        await Slots.save()
        res.redirect(`/user/${req.params.id}/${req.params.p_id}/payment`);
    }
        
})

router.get('/:id/:p_id/payment',async(req,res)=> {

    res.render('../views/payment',{slotno:req.app.get('slotno'),price:req.app.get('price')});
})




module.exports = router;
