import Image from "next/image";

export default function Profile() {
  return (
    <div>
      <h1>My Profile</h1>
      <Image 
        src="/RageBait image.png" 
        alt="Profile picture" 
        width={200} 
        height={200} 
      />
    </div>
  );
}
