import { NextRequest, NextResponse } from "next/server"
async function driveToken() {
  const form = new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!,refresh_token:process.env.GOOGLE_REFRESH_TOKEN!,grant_type:"refresh_token"})
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",body:form,cache:"no-store"})
  const data=await response.json()
  if(!response.ok || !data.access_token) throw new Error("Autentikasi Google Drive gagal. Periksa refresh token.")
  return data.access_token as string
}
async function driveJson(url:string,token:string,method:string,body:unknown) {
  const response=await fetch(url,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)})
  const data=await response.json().catch(()=>({}))
  if(!response.ok) throw new Error("Google Drive: "+(data.error?.message||response.status))
  return data as {id:string;webViewLink?:string}
}

export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request:NextRequest) {
  try {
    if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.GOOGLE_REFRESH_TOKEN||!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) return NextResponse.json({error:"Google Drive belum dikonfigurasi."},{status:503})
    const {sessionId,media}=await request.json()
    if(typeof sessionId!=="string"||!/^[a-f0-9-]{36}$/.test(sessionId)||!Array.isArray(media)||!media.length||media.length>80) return NextResponse.json({error:"Data sesi tidak valid."},{status:400})
    const validated:{name:string;url:string;type:string}[]=[]
    for(const item of media) {
      if(typeof item.name!=="string"||typeof item.url!=="string"||typeof item.type!=="string") return NextResponse.json({error:"File tidak valid."},{status:400})
      const url=new URL(item.url)
      if(url.protocol!=="https:"||!url.hostname.endsWith(".public.blob.vercel-storage.com")||!url.pathname.includes("/sessions/"+sessionId+"/")||!/^(image\/(png|jpeg|webp|gif)|video\/(webm|mp4))$/.test(item.type)) return NextResponse.json({error:"Alamat file tidak valid."},{status:400})
      validated.push({name:item.name.slice(0,120),url:url.toString(),type:item.type})
    }
    const token=await driveToken()
    const folder=await driveJson("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",token,"POST",{name:"ArctaBooth-"+sessionId,mimeType:"application/vnd.google-apps.folder",parents:[process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID]})
    for(const item of validated) {
      const source=await fetch(item.url)
      if(!source.ok||!source.body) throw new Error("Gagal mengambil file hasil sesi.")
      const boundary="arctabooth_"+sessionId.replaceAll("-","")
      const metadata=JSON.stringify({name:item.name,parents:[folder.id]})
      const prefix=new TextEncoder().encode("--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+metadata+"\r\n--"+boundary+"\r\nContent-Type: "+item.type+"\r\n\r\n")
      const suffix=new TextEncoder().encode("\r\n--"+boundary+"--")
      const stream=new ReadableStream<Uint8Array>({async start(controller){controller.enqueue(prefix);const reader=source.body!.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;controller.enqueue(value)}}finally{reader.releaseLock()}controller.enqueue(suffix);controller.close()}})
      const upload=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"multipart/related; boundary="+boundary},body:stream,duplex:"half"} as RequestInit & {duplex:string})
      if(!upload.ok){const details=await upload.json().catch(()=>({}));throw new Error("Upload Google Drive gagal: "+(details.error?.message||upload.status))}
    }
    await driveJson("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(folder.id)+"/permissions?fields=id",token,"POST",{type:"anyone",role:"reader"})
    return NextResponse.json({id:sessionId,shareUrl:"https://drive.google.com/drive/folders/"+folder.id})
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Gagal menyimpan sesi ke Google Drive."},{status:500})}
}
