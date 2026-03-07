use qwk_rs::Parser;

#[test]
fn it_works() {
    let parser = Parser::from_file("cavebbs.qwk").expect("Failed to parse cavebbs.qwk");

    println!("Does this work?");
    for message in &parser.messages {
        println!("{}", message.text);
    }
}
