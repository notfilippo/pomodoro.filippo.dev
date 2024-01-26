import { Center, Code, Flex } from "@chakra-ui/react";
import { Link } from "react-router-dom";

export default function Root() {
  const room = "/" + Math.floor(Math.random() * 10000);

  return (
    <Center h="100vh">
      <Flex direction="column" alignItems="center" gap={2}>
        <Link to={room}>Go to a random room</Link>
        <Code>{__COMMIT_HASH__}</Code>
      </Flex>
    </Center>
  );
}
