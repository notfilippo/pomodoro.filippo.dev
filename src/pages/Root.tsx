import { Center } from "@chakra-ui/react";
import { Link } from "react-router-dom";

export default function Root() {
  const room = "/" + Math.floor(Math.random() * 10000);

  return (
    <Center h="100vh">
      <Link to={room}>Go to a random room</Link>
    </Center>
  );
}
